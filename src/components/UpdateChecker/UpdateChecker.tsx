import { useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import styles from "./UpdateChecker.module.css";

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error" | "up-to-date";

export function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const checkForUpdates = async () => {
    setStatus("checking");
    setError(null);

    try {
      const update = await check();

      if (update) {
        setNewVersion(update.version);
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新の確認に失敗しました");
      setStatus("error");
    }
  };

  const downloadAndInstall = async () => {
    setStatus("downloading");
    setProgress(0);

    try {
      const update = await check();
      if (!update) {
        setStatus("up-to-date");
        return;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setStatus("ready");
            break;
        }
      });

      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ダウンロードに失敗しました");
      setStatus("error");
    }
  };

  const handleRelaunch = async () => {
    await relaunch();
  };

  const openModal = () => {
    setShowModal(true);
    setStatus("idle");
    setError(null);
    setProgress(0);
    setNewVersion(null);
  };

  const closeModal = () => {
    if (status !== "downloading") {
      setShowModal(false);
    }
  };

  return (
    <>
      <button className={styles.checkButton} onClick={openModal} title="更新を確認">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>

      {showModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>アプリの更新</h2>
              <button className={styles.closeButton} onClick={closeModal} disabled={status === "downloading"}>
                ×
              </button>
            </div>

            <div className={styles.modalContent}>
              {status === "idle" && (
                <div className={styles.idleState}>
                  <p>新しいバージョンがあるか確認します。</p>
                  <button className={styles.primaryButton} onClick={checkForUpdates}>
                    更新を確認
                  </button>
                </div>
              )}

              {status === "checking" && (
                <div className={styles.checkingState}>
                  <div className={styles.spinner} />
                  <p>更新を確認中...</p>
                </div>
              )}

              {status === "up-to-date" && (
                <div className={styles.upToDateState}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                  <p>最新バージョンです</p>
                  <button className={styles.secondaryButton} onClick={closeModal}>
                    閉じる
                  </button>
                </div>
              )}

              {status === "available" && (
                <div className={styles.availableState}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <p>新しいバージョンがあります</p>
                  <p className={styles.version}>バージョン {newVersion}</p>
                  <button className={styles.primaryButton} onClick={downloadAndInstall}>
                    ダウンロードしてインストール
                  </button>
                </div>
              )}

              {status === "downloading" && (
                <div className={styles.downloadingState}>
                  <div className={styles.progressContainer}>
                    <div className={styles.progressBar} style={{ width: `${progress}%` }} />
                  </div>
                  <p>ダウンロード中... {progress}%</p>
                </div>
              )}

              {status === "ready" && (
                <div className={styles.readyState}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22,4 12,14.01 9,11.01" />
                  </svg>
                  <p>更新の準備ができました</p>
                  <p className={styles.hint}>アプリを再起動して更新を適用します。</p>
                  <button className={styles.primaryButton} onClick={handleRelaunch}>
                    今すぐ再起動
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className={styles.errorState}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p>エラーが発生しました</p>
                  <p className={styles.errorMessage}>{error}</p>
                  <button className={styles.secondaryButton} onClick={() => setStatus("idle")}>
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
