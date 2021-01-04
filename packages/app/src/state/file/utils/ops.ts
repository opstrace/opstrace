import { TextOperations } from "../types";

export function applyOps(content: string, ops: TextOperations) {
  let updatedContent = content;

  for (const [offset, change] of ops) {
    const start = offset;

    if (typeof change === "string") {
      // Insert operation
      updatedContent =
        updatedContent.slice(0, start) + change + updatedContent.slice(start);
    } else {
      // Delete operation
      updatedContent =
        updatedContent.slice(0, start) + updatedContent.slice(offset + change);
    }
  }

  return updatedContent;
}
