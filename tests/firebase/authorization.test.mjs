import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  requireRole,
  requireStudentOwner,
  requireClassAccess,
  requireTeachingAssignment,
  requireClassTeachingAssignment
} from "../../netlify/functions/lib/authorization.mjs";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GCLOUD_PROJECT || "";

const emulatorConfigured =
  Boolean(authHost) && Boolean(firestoreHost) && projectId.startsWith("demo-");

test("role and ownership checks reject unauthorized users", () => {
  const admin = { uid: "admin-1", role: "admin" };
  const teacher = { uid: "teacher-1", role: "teacher" };
  const student = { uid: "student-1", role: "student" };

  assert.equal(requireRole(admin, ["admin"]), admin);
  assert.equal(requireRole(teacher, ["teacher"]), teacher);
  assert.throws(() => requireRole(teacher, ["admin"]), { message: "FORBIDDEN" });
  assert.equal(requireStudentOwner(student, "student-1"), student);
  assert.throws(() => requireStudentOwner(student, "student-2"), { message: "FORBIDDEN" });
  assert.throws(() => requireStudentOwner(teacher, "teacher-1"), { message: "FORBIDDEN" });
});

test("class and subject authorization enforces exact active assignments", {
  skip: !emulatorConfigured
}, async (t) => {
  const { getDb } = await import("../../netlify/functions/lib/firebase-admin.mjs");
  const db = getDb();
  const suffix = randomUUID();
  const teacherUid = `teacher-${suffix}`;
  const classId = `class-${suffix}`;
  const otherClassId = `other-class-${suffix}`;
  const physicsId = `physics-${suffix}`;
  const mathsId = `maths-${suffix}`;
  const classAccessRef = db.collection("classAccess").doc(`test-${suffix}`);
  const assignmentRef = db.collection("teachingAssignments").doc(`test-${suffix}`);
  const teacher = { uid: teacherUid, role: "teacher" };
  const admin = { uid: `admin-${suffix}`, role: "admin" };

  try {
    await classAccessRef.set({
      userUid: teacherUid,
      classId,
      accessType: "teacher",
      active: true
    });
    await assignmentRef.set({
      teacherUid,
      classId,
      subjectId: physicsId,
      active: true
    });

    await t.test("teacher can access an actively assigned class and subject", async () => {
      assert.equal(await requireClassAccess(db, teacher, classId, "teacher"), teacher);
      assert.equal(await requireTeachingAssignment(db, teacher, classId, physicsId), teacher);
      assert.equal(await requireClassTeachingAssignment(db, teacher, classId), teacher);
    });

    await t.test("teacher cannot access another class", async () => {
      await assert.rejects(
        requireClassAccess(db, teacher, otherClassId, "teacher"),
        { message: "FORBIDDEN" }
      );
      await assert.rejects(
        requireTeachingAssignment(db, teacher, otherClassId, physicsId),
        { message: "FORBIDDEN" }
      );
    });

    await t.test("teacher cannot access an unassigned subject in the same class", async () => {
      await assert.rejects(
        requireTeachingAssignment(db, teacher, classId, mathsId),
        { message: "FORBIDDEN" }
      );
    });

    await t.test("administrator can pass class access checks without teacher assignments", async () => {
      assert.equal(await requireClassAccess(db, admin, classId, "teacher"), admin);
    });

    await t.test("student cannot use teacher class authorization", async () => {
      await assert.rejects(
        requireClassAccess(db, { uid: `student-${suffix}`, role: "student" }, classId, "teacher"),
        { message: "FORBIDDEN" }
      );
      await assert.rejects(
        requireTeachingAssignment(db, { uid: `student-${suffix}`, role: "student" }, classId, physicsId),
        { message: "FORBIDDEN" }
      );
    });

    await t.test("inactive class access revokes teacher scope", async () => {
      await classAccessRef.update({ active: false });
      await assert.rejects(
        requireTeachingAssignment(db, teacher, classId, physicsId),
        { message: "FORBIDDEN" }
      );
    });
  } finally {
    await classAccessRef.delete().catch(() => {});
    await assignmentRef.delete().catch(() => {});
  }
});
