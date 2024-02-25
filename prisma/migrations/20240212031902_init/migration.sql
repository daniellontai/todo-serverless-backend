-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);
