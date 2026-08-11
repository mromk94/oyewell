import { prisma } from '../prisma.js';

export async function getActiveDocument(type: string) {
  return prisma.legalDocument.findUnique({
    where: { type: type as any },
  });
}

export async function createDocument(input: {
  type: string;
  version: string;
  title: string;
  content: string;
}) {
  return prisma.legalDocument.upsert({
    where: { type: input.type as any },
    update: { version: input.version, title: input.title, content: input.content },
    create: {
      type: input.type as any,
      version: input.version,
      title: input.title,
      content: input.content,
    },
  });
}

export async function recordAcceptance(input: {
  userId: string;
  documentType: string;
  version: string;
  ip?: string;
}) {
  return prisma.termsAcceptance.upsert({
    where: { userId_documentType_version: { userId: input.userId, documentType: input.documentType, version: input.version } },
    update: {},
    create: {
      userId: input.userId,
      documentType: input.documentType,
      version: input.version,
      ip: input.ip,
    },
  });
}

export async function hasAccepted(userId: string, documentType: string, version: string) {
  const row = await prisma.termsAcceptance.findUnique({
    where: { userId_documentType_version: { userId, documentType, version } },
  });
  return !!row;
}
