#!/usr/bin/env node

import { program } from "commander";
import initSqlJs from "sql.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

// MyNote database path (Windows)
const DB_PATH = join(
  homedir(),
  "AppData",
  "Roaming",
  "com.mynote.app",
  "mynote.db"
);

// Get project name from package.json or folder name
function getProjectName(customName) {
  if (customName) return customName;

  const packageJsonPath = join(process.cwd(), "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      return pkg.name || basename(process.cwd());
    } catch {
      return basename(process.cwd());
    }
  }
  return basename(process.cwd());
}

// Format current date/time
function formatDateTime() {
  const now = new Date();
  return now.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Create TipTap JSON content
function createTipTapContent(existingContent, newEntry) {
  let doc;

  try {
    doc = existingContent ? JSON.parse(existingContent) : null;
  } catch {
    doc = null;
  }

  if (!doc || !doc.content) {
    doc = {
      type: "doc",
      content: [],
    };
  }

  // Add new entry as paragraph
  const newParagraph = {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: `[${formatDateTime()}] ${newEntry}`,
      },
    ],
  };

  // Add at the beginning (newest first)
  doc.content.unshift(newParagraph);

  return JSON.stringify(doc);
}

// Load database
async function loadDatabase(dbPath) {
  const SQL = await initSqlJs();
  const fileBuffer = readFileSync(dbPath);
  return new SQL.Database(fileBuffer);
}

// Save database
function saveDatabase(db, dbPath) {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);
}

// Find or create note for project
function findOrCreateProjectNote(db, projectName, parentTitle = "開発ログ") {
  // First, find or create parent note "開発ログ"
  let parentResult = db.exec(
    `SELECT id FROM notes WHERE title = '${parentTitle}' AND parent_id IS NULL`
  );

  let parentId;
  if (parentResult.length === 0 || parentResult[0].values.length === 0) {
    db.run(
      `INSERT INTO notes (title, content, parent_id, position) VALUES ('${parentTitle}', '', NULL, 0)`
    );
    parentId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    console.log(`Created parent note: ${parentTitle}`);
  } else {
    parentId = parentResult[0].values[0][0];
  }

  // Find or create project note under parent
  let projectResult = db.exec(
    `SELECT id, content FROM notes WHERE title = '${projectName}' AND parent_id = ${parentId}`
  );

  let projectId, projectContent;
  if (projectResult.length === 0 || projectResult[0].values.length === 0) {
    db.run(
      `INSERT INTO notes (title, content, parent_id, position) VALUES ('${projectName}', '', ${parentId}, 0)`
    );
    projectId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    projectContent = "";
    console.log(`Created project note: ${projectName}`);
  } else {
    projectId = projectResult[0].values[0][0];
    projectContent = projectResult[0].values[0][1] || "";
  }

  return { id: projectId, content: projectContent };
}

// Main CLI
program
  .name("mynote-log")
  .description("Log updates to MyNote from any project")
  .version("1.0.0");

program
  .argument("<message>", "Update message to log")
  .option("-p, --project <name>", "Project name (default: from package.json or folder name)")
  .option("-d, --db <path>", "Custom database path")
  .action(async (message, options) => {
    const dbPath = options.db || DB_PATH;

    if (!existsSync(dbPath)) {
      console.error(`Error: MyNote database not found at ${dbPath}`);
      console.error("Make sure MyNote has been run at least once.");
      process.exit(1);
    }

    const projectName = getProjectName(options.project);

    try {
      const db = await loadDatabase(dbPath);

      const projectNote = findOrCreateProjectNote(db, projectName);
      const newContent = createTipTapContent(projectNote.content, message);

      db.run(
        `UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newContent, projectNote.id]
      );

      saveDatabase(db, dbPath);

      console.log(`✓ Logged to "${projectName}": ${message}`);

      db.close();
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all project notes")
  .option("-d, --db <path>", "Custom database path")
  .action(async (options) => {
    const dbPath = options.db || DB_PATH;

    if (!existsSync(dbPath)) {
      console.error(`Error: MyNote database not found at ${dbPath}`);
      process.exit(1);
    }

    try {
      const db = await loadDatabase(dbPath);

      const parentResult = db.exec(
        `SELECT id FROM notes WHERE title = '開発ログ' AND parent_id IS NULL`
      );

      if (parentResult.length === 0 || parentResult[0].values.length === 0) {
        console.log("No development logs found.");
        db.close();
        return;
      }

      const parentId = parentResult[0].values[0][0];
      const projectsResult = db.exec(
        `SELECT title, updated_at FROM notes WHERE parent_id = ${parentId}`
      );

      console.log("\n開発ログ:");
      if (projectsResult.length > 0) {
        projectsResult[0].values.forEach((row) => {
          console.log(`  - ${row[0]} (updated: ${row[1]})`);
        });
      }
      console.log("");

      db.close();
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Show database path and status")
  .action(() => {
    console.log(`\nMyNote CLI Configuration:`);
    console.log(`  Database path: ${DB_PATH}`);
    console.log(`  Database exists: ${existsSync(DB_PATH) ? "Yes" : "No"}`);
    console.log("");
  });

program.parse();
