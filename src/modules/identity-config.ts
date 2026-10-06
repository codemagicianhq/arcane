/**
 * The identity environments `spell login` can sign in to
 * (features/spell-login/PRD.md, R9). Two tenants, production and
 * development, selected by `ARCANE_ENVIRONMENT`; production when unset.
 *
 * Every value here is public configuration, not a secret: the client ids are
 * those of a public OAuth client (they ship in this package by definition),
 * and the tenant ids are part of the discovery URLs anyone can fetch. Keeping
 * them in one module is what lets a later change of provider stay a
 * configuration change.
 */

export type IdentityEnvironment = "production" | "development";

export interface IdentityEnvironmentConfig {
  environment: IdentityEnvironment;
  /** The tenant's own id, part of the discovery URL and the token issuer. */
  tenantId: string;
  /** The host that serves sign-in and the discovery document. */
  signInHost: string;
  /** The CLI's public-client id in that tenant. */
  clientId: string;
  discoveryUrl: string;
}

export const IDENTITY_ENVIRONMENTS: Readonly<Record<IdentityEnvironment, IdentityEnvironmentConfig>> = {
  production: {
    environment: "production",
    tenantId: "9f8edbfb-291c-4c4a-b9cc-8820a04f8973",
    signInHost: "arcaneai.ciamlogin.com",
    clientId: "7cd8f05d-9979-4458-8ca2-47c67748c41f",
    discoveryUrl:
      "https://arcaneai.ciamlogin.com/9f8edbfb-291c-4c4a-b9cc-8820a04f8973/v2.0/.well-known/openid-configuration",
  },
  development: {
    environment: "development",
    tenantId: "b365de0e-3026-4afe-bf5b-556fccb4ffcf",
    signInHost: "arcaneaidev.ciamlogin.com",
    clientId: "651be720-83cc-452b-8346-abf20713ad12",
    discoveryUrl:
      "https://arcaneaidev.ciamlogin.com/b365de0e-3026-4afe-bf5b-556fccb4ffcf/v2.0/.well-known/openid-configuration",
  },
};

/**
 * What `spell login` asks for. `offline_access` is what returns a refresh
 * token, and without it there is nothing to store. One place to extend when a
 * service API's scope is published, so the person consents once (PRD, decision 6).
 */
export const SIGN_IN_SCOPES: readonly string[] = ["openid", "profile", "email", "offline_access"];

export const ENVIRONMENT_VARIABLE = "ARCANE_ENVIRONMENT";

export class UnknownEnvironmentError extends Error {
  constructor(value: string) {
    super(
      `${ENVIRONMENT_VARIABLE}=${JSON.stringify(value)} is not an environment. ` +
        "Use \"production\" (the default) or \"development\".",
    );
    this.name = "UnknownEnvironmentError";
  }
}

/** Resolves the environment from `ARCANE_ENVIRONMENT`; production when unset or empty. */
export function resolveIdentityEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): IdentityEnvironmentConfig {
  const raw = (env[ENVIRONMENT_VARIABLE] ?? "").trim().toLowerCase();
  if (raw === "" || raw === "prod" || raw === "production") return IDENTITY_ENVIRONMENTS.production;
  if (raw === "dev" || raw === "development") return IDENTITY_ENVIRONMENTS.development;
  throw new UnknownEnvironmentError(env[ENVIRONMENT_VARIABLE] ?? "");
}
