import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPO || "";
const docsPath = process.env.GITHUB_DOCS_PATH || "docs";

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
}

/**
 * List all files in the docs folder of the GitHub repo
 */
export async function listDocuments(): Promise<GitHubFile[]> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: docsPath,
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data
      .filter((item: any) => item.type === "file")
      .map((item: any) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        download_url: item.download_url,
      }));
  } catch (error: any) {
    // If the directory doesn't exist, return empty
    if (error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Download raw file content from GitHub
 */
export async function downloadFile(filePath: string): Promise<Buffer> {
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: filePath,
    mediaType: {
      format: "raw",
    },
  });

  // For raw format, response.data is the file content
  if (typeof response.data === "string") {
    return Buffer.from(response.data);
  }

  // If it's base64 encoded
  const content = (response.data as any).content;
  if (content) {
    return Buffer.from(content, "base64");
  }

  return Buffer.from(response.data as any);
}

/**
 * Upload a file to the GitHub repo's docs folder
 */
export async function uploadFile(
  filename: string,
  content: Buffer
): Promise<void> {
  const path = `${docsPath}/${filename}`;

  // Check if file already exists (to get SHA for update)
  let existingSha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    if (!Array.isArray(existing.data)) {
      existingSha = existing.data.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Add document: ${filename}`,
    content: content.toString("base64"),
    ...(existingSha ? { sha: existingSha } : {}),
  });
}

/**
 * Delete a file from the GitHub repo
 */
export async function deleteFile(filename: string): Promise<void> {
  const path = `${docsPath}/${filename}`;

  // Get the file's SHA (required for deletion)
  const existing = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if (Array.isArray(existing.data)) {
    throw new Error("Path is a directory, not a file");
  }

  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path,
    message: `Delete document: ${filename}`,
    sha: existing.data.sha,
  });
}
