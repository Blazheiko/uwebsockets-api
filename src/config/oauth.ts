import { env } from 'node:process';

const oauthConfig = Object.freeze({
  google: {
    clientId: env['GOOGLE_CLIENT_ID'] ?? '',
    clientSecret: env['GOOGLE_CLIENT_SECRET'] ?? '',
    redirectUri: env['GOOGLE_REDIRECT_URI'] ?? '',
  },
  facebook: {
    clientId: env['FACEBOOK_CLIENT_ID'] ?? '',
    clientSecret: env['FACEBOOK_CLIENT_SECRET'] ?? '',
    redirectUri: env['FACEBOOK_REDIRECT_URI'] ?? '',
  },
  github: {
    clientId: env['GITHUB_CLIENT_ID'] ?? '',
    clientSecret: env['GITHUB_CLIENT_SECRET'] ?? '',
    redirectUri: env['GITHUB_REDIRECT_URI'] ?? '',
  },
  gitlab: {
    clientId: env['GITLAB_CLIENT_ID'] ?? '',
    clientSecret: env['GITLAB_CLIENT_SECRET'] ?? '',
    redirectUri: env['GITLAB_REDIRECT_URI'] ?? '',
  },
  frontendSuccessUrl: env['OAUTH_FRONTEND_SUCCESS_URL'] ?? '/?oauth=success',
  frontendErrorUrl: env['OAUTH_FRONTEND_ERROR_URL'] ?? '/?error=oauth_failed',
});

export default oauthConfig;
