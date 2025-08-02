import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import logger from "./logger";
import prisma from "./prisma";
import redisClient from "./redis";
import resend from "./resend";

import serverEnv from "../serverEnv";

import { logEmailError } from "../utils/fns";

const auth = betterAuth({
  appName: serverEnv.serviceName,

  database: prismaAdapter(prisma, {
    provider: "postgresql", // whatever database provider you want
  }),

  advanced: { cookiePrefix: serverEnv.serviceName },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 16,
    requireEmailVerification: true,

    sendResetPassword: async ({ user, url }, request) => {
      const { error } = await resend.emails.send({
        from: "Express Starter Kit <onboarding@resend.dev>", //TODO: Use your own template
        to: [user.email],
        subject: "Reset your password",
        html: `<p>Click the link to reset your password: <a href="${url}">${url}</a>. This link expires in 1 hour.</p>`,
      });

      if (error) {
        logEmailError("reset-password", user, error, request);
      }
    },

    onPasswordReset: async ({ user }, request) => {
      const { error } = await resend.emails.send({
        from: "Express Starter Kit <onboarding@resend.dev>", //TODO: Use your own template
        to: [user.email],
        subject: "Password Reset",
        html: `<p>Your password has been successfuly reset.</p>`,
      });

      if (error) {
        logEmailError("password-reset", user, error, request);
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 3600,

    sendVerificationEmail: async ({ user, url }, request) => {
      const { error } = await resend.emails.send({
        from: "Express Starter Kit <onboarding@resend.dev>", //TODO: Use your own template
        to: [user.email],
        subject: "Verify your Email Address.",
        html: `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>`,
      });

      if (error) {
        logEmailError("verification", user, error, request);
      }
    },
  },

  logger: {
    disabled: false,
    level: "warn",
    log: (level, message, ...args) => {
      logger[level](message, { metadata: args });
    },
  },

  socialProviders: {
    google: {
      prompt: "select_account",
      enabled: true,
      clientId: serverEnv.googleClientId!,
      clientSecret: serverEnv.googleClientSecret!,
    },
  },

  secondaryStorage: {
    get: async (key) => {
      try {
        const value = await redisClient.get(key);

        return value ? value : null;
      } catch (error) {
        logger.error(`Failed to get key: ${key} from cache`, error);

        return null;
      }
    },

    set: async (key: string, value: string) => {
      try {
        await redisClient.set(key, value);
      } catch (error) {
        logger.error(`Failed to set key: ${key} in cache`, error);
      }
    },

    delete: async (key: string) => {
      try {
        await redisClient.del(key);
      } catch (error) {
        logger.error(`Failed to delete key: ${key} from cache`, error);
      }
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, //expires in 7 days
    updateAge: 2 * 60 * 60 * 24, //update the expiry every 2 days
    freshAge: 60 * 60 * 4, //4 days, if the session was created within the last 4 days its still considered fresh
    storeSessionInDatabase: true,
    preserveSessionInDatabase: false,
  },

  rateLimit: {
    max: 10,
    window: 60,
    storage: "secondary-storage",
    enabled: serverEnv.isProduction,
  },

  trustedOrigins: ["http://localhost:5173"], //TODO: add your trusted origins
});

export default auth;
