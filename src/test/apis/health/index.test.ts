import request from "supertest";

import { server } from "../../../server";

describe("test for the health api", () => {
  test("it should return a 200 status code", async () => {
    const res = await request(server).get("/health").expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Healthy",
      time: expect.any(String),
    });
  });
});
