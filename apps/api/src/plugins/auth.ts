import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config.js";
import { ACCESS_COOKIE_NAME } from "../utils/cookies.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      role: string;
      brandId: string | null;
    };
    user: {
      sub: string;
      role: string;
      brandId: string | null;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  // Access token JWT (15min) — extracted from galileo_at cookie
  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: "15m",
    },
    cookie: {
      cookieName: ACCESS_COOKIE_NAME,
      signed: false,
    },
  });

  // Refresh token JWT (7d) — separate secret + namespace
  await fastify.register(fastifyJwt, {
    secret: config.JWT_REFRESH_SECRET,
    namespace: "refresh",
    sign: {
      expiresIn: "7d",
    },
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.status(401).send({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
          },
        });
      }
    },
  );
});
