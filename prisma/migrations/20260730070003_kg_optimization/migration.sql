/*
  Warnings:

  - You are about to drop the column `notes` on the `KnowledgeNode` table. All the data in the column will be lost.
  - You are about to drop the column `pageNumber` on the `KnowledgeNode` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "_KnowledgeNodeToNote" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_KnowledgeNodeToNote_A_fkey" FOREIGN KEY ("A") REFERENCES "KnowledgeNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_KnowledgeNodeToNote_B_fkey" FOREIGN KEY ("B") REFERENCES "Note" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KnowledgeNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "chapterId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "masteryLevel" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unlearned',
    "tags" TEXT,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "description" TEXT,
    "nextReviewAt" DATETIME,
    "lastReviewAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeNode_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeNode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KnowledgeNode" ("chapterId", "createdAt", "id", "lastReviewAt", "masteryLevel", "name", "nextReviewAt", "parentId", "subjectId") SELECT "chapterId", "createdAt", "id", "lastReviewAt", "masteryLevel", "name", "nextReviewAt", "parentId", "subjectId" FROM "KnowledgeNode";
DROP TABLE "KnowledgeNode";
ALTER TABLE "new_KnowledgeNode" RENAME TO "KnowledgeNode";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_KnowledgeNodeToNote_AB_unique" ON "_KnowledgeNodeToNote"("A", "B");

-- CreateIndex
CREATE INDEX "_KnowledgeNodeToNote_B_index" ON "_KnowledgeNodeToNote"("B");
