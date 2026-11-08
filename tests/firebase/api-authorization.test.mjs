import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const projectId =
  process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GCLOUD_PROJECT || "";

const emulatorConfigured =
  Boolean(authHost) &&
  Boolean(firestoreHost) &&
  projectId.startsWith("demo-");

async function createSyntheticIdentity() {
  const email = `api-scope-${randomUUID()}@example.test`;
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "Synthetic-Test-Password-123",
        returnSecureToken: true
      })
    }
  );

  const payload = await response.json();

  if (!response.ok || !payload.localId || !payload.idToken) {
    throw new Error(
      `Could not create synthetic Auth emulator identity: ${JSON.stringify(payload.error || payload)}`
    );
  }

  return { uid: payload.localId, idToken: payload.idToken };
}

async function callClassSubject(idToken, classId, subjectId, method = "GET") {
  const request = new Request(
    `http://localhost/api/classes/${classId}/subjects/${subjectId}`,
    {
      method,
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : {}
    }
  );

  const { default: handler } = await import("../../netlify/functions/api.mjs");
  return handler(request, {});
}

test("class and subject API endpoint enforces authenticated scope", {
  skip: !emulatorConfigured
}, async (t) => {
  const { getAdminAuth, getDb } = await import("../../netlify/functions/lib/firebase-admin.mjs");
  const auth = getAdminAuth();
  const db = getDb();
  const suffix = randomUUID();

  const identities = [];
  const cleanupRefs = [];

  const classId = `api-class-${suffix}`;
  const otherClassId = `api-other-class-${suffix}`;
  const inactiveClassId = `api-inactive-class-${suffix}`;
  const physicsId = `api-physics-${suffix}`;
  const mathsId = `api-maths-${suffix}`;
  const unassignedSubjectId = `api-unassigned-subject-${suffix}`;
  const inactiveSubjectId = `api-inactive-subject-${suffix}`;

  const classData = {
    name: "Synthetic Grade 9",
    grade: 9,
    academicSessionId: "2099",
    active: true,
    internalNotes: "must-not-be-returned"
  };

  const subjectData = {
    name: "Synthetic Physics",
    board: "AJK",
    grade: 9,
    active: true,
    answerKey: "must-not-be-returned"
  };

  try {
    const admin = await createSyntheticIdentity();
    const teacher = await createSyntheticIdentity();
    const student = await createSyntheticIdentity();
    identities.push(admin, teacher, student);

    for (const [identity, role] of [
      [admin, "admin"],
      [teacher, "teacher"],
      [student, "student"]
    ]) {
      const ref = db.collection("users").doc(identity.uid);
      cleanupRefs.push(ref);
      await ref.set({ role, active: true, displayName: `Synthetic ${role}` });
    }

    const classRef = db.collection("classes").doc(classId);
    const otherClassRef = db.collection("classes").doc(otherClassId);
    const inactiveClassRef = db.collection("classes").doc(inactiveClassId);
    const physicsRef = db.collection("subjects").doc(physicsId);
    const mathsRef = db.collection("subjects").doc(mathsId);
    const unassignedSubjectRef = db.collection("subjects").doc(unassignedSubjectId);
    const inactiveSubjectRef = db.collection("subjects").doc(inactiveSubjectId);
    cleanupRefs.push(
      classRef, otherClassRef, inactiveClassRef,
      physicsRef, mathsRef, unassignedSubjectRef, inactiveSubjectRef
    );

    await Promise.all([
      classRef.set(classData),
      otherClassRef.set({ ...classData, name: "Synthetic Other Grade 9" }),
      inactiveClassRef.set({ ...classData, active: false }),
      physicsRef.set(subjectData),
      mathsRef.set({ ...subjectData, name: "Synthetic Mathematics" }),
      unassignedSubjectRef.set({ ...subjectData, name: "Synthetic Unassigned Subject" }),
      inactiveSubjectRef.set({ ...subjectData, active: false })
    ]);

    const teacherAccessRef = db.collection("classAccess").doc(`api-teacher-${suffix}`);
    const studentAccessRef = db.collection("classAccess").doc(`api-student-${suffix}`);
    const inactiveStudentAccessRef = db.collection("classAccess").doc(`api-inactive-student-${suffix}`);
    const teacherAssignmentRef = db.collection("teachingAssignments").doc(`api-assignment-${suffix}`);
    const mathsAssignmentRef = db.collection("teachingAssignments").doc(`api-maths-assignment-${suffix}`);
    const inactiveSubjectAssignmentRef = db.collection("teachingAssignments").doc(`api-inactive-subject-assignment-${suffix}`);
    cleanupRefs.push(
      teacherAccessRef, studentAccessRef, inactiveStudentAccessRef,
      teacherAssignmentRef, mathsAssignmentRef, inactiveSubjectAssignmentRef
    );

    await Promise.all([
      teacherAccessRef.set({
        userUid: teacher.uid,
        classId,
        accessType: "teacher",
        active: true
      }),
      studentAccessRef.set({
        userUid: student.uid,
        classId,
        accessType: "student",
        active: true
      }),
      inactiveStudentAccessRef.set({
        userUid: student.uid,
        classId: inactiveClassId,
        accessType: "student",
        active: true
      }),
      teacherAssignmentRef.set({
        teacherUid: teacher.uid,
        classId,
        subjectId: physicsId,
        active: true
      }),
      mathsAssignmentRef.set({
        teacherUid: teacher.uid,
        classId,
        subjectId: mathsId,
        active: true
      }),
      inactiveSubjectAssignmentRef.set({
        teacherUid: teacher.uid,
        classId,
        subjectId: inactiveSubjectId,
        active: true
      })
    ]);

    await t.test("administrator can read an active class and matching subject", async () => {
      const response = await callClassSubject(admin.idToken, classId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.class.id, classId);
      assert.equal(payload.data.subject.id, physicsId);
      assert.equal(JSON.stringify(payload).includes("must-not-be-returned"), false);
    });

    await t.test("teacher can read an actively assigned class and subject", async () => {
      const response = await callClassSubject(teacher.idToken, classId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.subject.name, "Synthetic Physics");
    });

    await t.test("teacher cannot read an unassigned subject", async () => {
      const response = await callClassSubject(teacher.idToken, classId, unassignedSubjectId);
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.error.code, "FORBIDDEN");
    });

    await t.test("teacher cannot read a class without active class access", async () => {
      const response = await callClassSubject(teacher.idToken, otherClassId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.error.code, "FORBIDDEN");
    });

    await t.test("student can read the subject in their active class", async () => {
      const response = await callClassSubject(student.idToken, classId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.class.grade, 9);
    });

    await t.test("student cannot read another class", async () => {
      const response = await callClassSubject(student.idToken, otherClassId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.error.code, "FORBIDDEN");
    });

    await t.test("inactive class data is not returned", async () => {
      const response = await callClassSubject(student.idToken, inactiveClassId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 404);
      assert.equal(payload.error.code, "NOT_FOUND");
    });

    await t.test("inactive subject data is not returned", async () => {
      const response = await callClassSubject(teacher.idToken, classId, inactiveSubjectId);
      const payload = await response.json();

      assert.equal(response.status, 404);
      assert.equal(payload.error.code, "NOT_FOUND");
    });

    await t.test("protected class and subject route rejects missing authentication", async () => {
      const response = await callClassSubject(null, classId, physicsId);
      const payload = await response.json();

      assert.equal(response.status, 401);
      assert.equal(payload.error.code, "UNAUTHENTICATED");
    });

    await t.test("protected class and subject route rejects unsupported methods", async () => {
      const response = await callClassSubject(admin.idToken, classId, physicsId, "POST");
      const payload = await response.json();

      assert.equal(response.status, 405);
      assert.equal(payload.error.code, "METHOD_NOT_ALLOWED");
    });
  } finally {
    await Promise.all(cleanupRefs.map(ref => ref.delete().catch(() => {})));
    await Promise.all(identities.map(identity =>
      auth.deleteUser(identity.uid).catch(() => {})
    ));
  }
});
