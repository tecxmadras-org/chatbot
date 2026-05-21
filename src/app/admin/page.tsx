"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface DocFile {
  name: string;
  size: number;
  sha: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [files, setFiles] = useState<DocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storedPassword = useRef("");

  const getAuthHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${storedPassword.current}`,
    };
  }, []);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/list", {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    storedPassword.current = password;

    try {
      const res = await fetch("/api/admin/list", {
        headers: { Authorization: `Bearer ${password}` },
      });

      if (res.ok) {
        setIsAuthenticated(true);
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        setAuthError("Invalid password. Please try again.");
      }
    } catch {
      setAuthError("Connection error. Please try again.");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadFiles();
    }
  }, [isAuthenticated, loadFiles]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "csv", "xlsx", "xls"];

    if (!ext || !allowed.includes(ext)) {
      setUploadStatus({
        type: "error",
        message: `Invalid file type. Allowed: ${allowed.join(", ")}`,
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        type: "error",
        message: "File must be under 10MB",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus({
          type: "success",
          message: `"${data.filename}" uploaded successfully!`,
        });
        await loadFiles();
      } else {
        setUploadStatus({
          type: "error",
          message: data.error || "Upload failed",
        });
      }
    } catch {
      setUploadStatus({
        type: "error",
        message: "Upload failed. Please try again.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    setDeletingFile(filename);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "DELETE",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        setUploadStatus({
          type: "success",
          message: `"${filename}" deleted successfully.`,
        });
        await loadFiles();
      } else {
        const data = await res.json();
        setUploadStatus({
          type: "error",
          message: data.error || "Delete failed",
        });
      }
    } catch {
      setUploadStatus({
        type: "error",
        message: "Delete failed. Please try again.",
      });
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.toLowerCase().split(".").pop();
    if (ext === "pdf") return "📕";
    if (ext === "csv") return "📊";
    if (ext === "xlsx" || ext === "xls") return "📗";
    return "📄";
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          className="card animate-fade-in-up"
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "40px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              margin: "0 auto 24px",
              boxShadow: "0 8px 30px var(--color-primary-glow)",
            }}
          >
            🔐
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Admin Panel
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              marginBottom: "28px",
            }}
          >
            Enter the admin password to manage documents
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-glass"
              autoFocus
            />
            {authError && (
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--color-error)",
                }}
              >
                {authError}
              </p>
            )}
            <button
              type="submit"
              className="btn-glow"
              disabled={!password}
              style={{ width: "100%" }}
            >
              Sign In
            </button>
          </form>

          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "20px",
              fontSize: "13px",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            ← Back to Chat
          </a>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px 16px",
      }}
    >
      {/* Header */}
      <header
        className="animate-fade-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            Document{" "}
            <span className="gradient-text">Manager</span>
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              marginTop: "4px",
            }}
          >
            Upload and manage college documents
          </p>
        </div>
        <a
          href="/"
          style={{
            padding: "8px 16px",
            borderRadius: "10px",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            fontSize: "13px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-border)";
          }}
        >
          ← Chat
        </a>
      </header>

      {/* Upload Section */}
      <div
        className={`drop-zone animate-fade-in-up ${dragActive ? "active" : ""}`}
        style={{ marginBottom: "24px" }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.xlsx,.xls"
          onChange={(e) => handleUpload(e.target.files)}
          style={{ display: "none" }}
          id="file-upload"
        />

        {isUploading ? (
          <div>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-primary)",
                margin: "0 auto 16px",
                animation: "typing-dot 1s linear infinite",
              }}
            />
            <p style={{ color: "var(--color-text-secondary)" }}>
              Uploading to GitHub...
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "40px",
                marginBottom: "12px",
              }}
            >
              {dragActive ? "📥" : "☁️"}
            </div>
            <p
              style={{
                fontSize: "15px",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              {dragActive
                ? "Drop your file here"
                : "Drag & drop or click to upload"}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              PDF, CSV, or Excel files (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {uploadStatus && (
        <div
          className="animate-fade-in-up"
          style={{
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            background:
              uploadStatus.type === "success"
                ? "rgba(16,185,129,0.1)"
                : "rgba(239,68,68,0.1)",
            border: `1px solid ${
              uploadStatus.type === "success"
                ? "rgba(16,185,129,0.25)"
                : "rgba(239,68,68,0.25)"
            }`,
            color:
              uploadStatus.type === "success"
                ? "var(--color-success)"
                : "var(--color-error)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {uploadStatus.type === "success" ? "✅" : "❌"}
          {uploadStatus.message}
          <button
            onClick={() => setUploadStatus(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            Uploaded Documents
          </h2>
          <span
            style={{
              fontSize: "12px",
              padding: "4px 10px",
              borderRadius: "20px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--color-text-muted)",
            }}
          >
            Loading documents...
          </div>
        ) : files.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "48px 20px",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
            <p
              style={{
                fontSize: "15px",
                color: "var(--color-text-secondary)",
                marginBottom: "4px",
              }}
            >
              No documents uploaded yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              Upload PDF or Excel files to get started
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {files.map((file, index) => (
              <div
                key={file.sha}
                className="card animate-fade-in-up"
                style={{
                  animationDelay: `${index * 60}ms`,
                  animationFillMode: "backwards",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "var(--color-surface-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  {getFileIcon(file.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {formatSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(file.name)}
                  disabled={deletingFile === file.name}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid rgba(239,68,68,0.2)",
                    background: "rgba(239,68,68,0.08)",
                    color: "var(--color-error)",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "inherit",
                    opacity: deletingFile === file.name ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                  }}
                >
                  {deletingFile === file.name ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
