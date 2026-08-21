import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  consentRecordsTable: {},
  contributorsTable: {},
  storyworldsTable: {},
}));

vi.mock("../../middlewares/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.session = { userId: 42 };
    next();
  },
}));

import consentsRouter from "../consents";

describe("consent settings", () => {
  it("keeps CIE/PIE derivative consent impossible to grant", async () => {
    const app = express();
    app.use(express.json());
    app.use("/", consentsRouter);

    const response = await request(app)
      .post("/")
      .send({
        actionType: "cie-pie-derivative",
        storyworldId: 1,
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "CIE/PIE derivative consent is not available",
    });
  });
});