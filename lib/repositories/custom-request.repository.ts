import prisma from '../prisma';
import { CustomRequestStatus } from '@prisma/client';

export interface CreateCustomRequestData {
  userId?: string;
  name: string;
  email: string;
  title?: string;
  details: string;
  imageUrls?: string[];
  requestedQuantity?: number;
}

export async function createCustomRequest(data: CreateCustomRequestData) {
  return prisma.customRequest.create({
    data: {
      userId: data.userId,
      name: data.name,
      email: data.email,
      title: data.title ?? 'Custom Request',
      details: data.details,
      imageUrls: data.imageUrls ?? [],
      requestedQuantity: data.requestedQuantity ?? 1,
      status: CustomRequestStatus.SUBMITTED,
    },
  });
}

export async function getCustomRequests(status?: CustomRequestStatus) {
  return prisma.customRequest.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateCustomRequestStatus(id: string, status: CustomRequestStatus) {
  return prisma.customRequest.update({
    where: { id },
    data: { status },
  });
}

export interface UpdateCustomRequestData {
  status?: CustomRequestStatus;
  quotePrice?: number;
  estimatedDays?: number;
  adminNotes?: string;
}

export async function updateCustomRequestFromSanity(id: string, data: UpdateCustomRequestData) {
  return prisma.customRequest.update({
    where: { id },
    data,
  });
}
