import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      generationsUsed?: number;
      generationsLimit?: number;
      generationsRemaining?: number;
      subscriptionPlan?: string | null;
      subscriptionExpiresAt?: string | null;
      allowedModes?: Array<"standard" | "techpassport" | "house3d">;
    };
  }
}


