import {
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from "firebase/firestore";
import type { Competition } from "@/lib/types/competition";
import type { Admission } from "@/lib/types/admission";
import type { Performance } from "@/lib/types/performance";
import type { Video } from "@/lib/types/video";
import type { Organization } from "@/lib/types/organization";
import type { Inquiry } from "@/lib/types/inquiry";

// Converter strips/restores the `id` field so it never lands in document data
// but is always available on the returned object.

export const competitionConverter: FirestoreDataConverter<Competition> = {
  toFirestore(data) {
    // `id` is stored as the document ID, never inside the body.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return { ...(data as Omit<Competition, "id">), id: snap.id } as Competition;
  },
};

export const admissionConverter: FirestoreDataConverter<Admission> = {
  toFirestore(data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return { ...(data as Omit<Admission, "id">), id: snap.id } as Admission;
  },
};

export const performanceConverter: FirestoreDataConverter<Performance> = {
  toFirestore(data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return {
      ...(data as Omit<Performance, "id">),
      id: snap.id,
    } as Performance;
  },
};

export const videoConverter: FirestoreDataConverter<Video> = {
  toFirestore(data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return { ...(data as Omit<Video, "id">), id: snap.id } as Video;
  },
};

export const organizationConverter: FirestoreDataConverter<Organization> = {
  toFirestore(data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return {
      ...(data as Omit<Organization, "id">),
      id: snap.id,
    } as Organization;
  },
};

export const inquiryConverter: FirestoreDataConverter<Inquiry> = {
  toFirestore(data) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(snap: QueryDocumentSnapshot, options?: SnapshotOptions) {
    const data = snap.data(options);
    return { ...(data as Omit<Inquiry, "id">), id: snap.id } as Inquiry;
  },
};
