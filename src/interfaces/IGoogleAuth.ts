import { OAuth2Client } from "googleapis-common";

/**
 * Interface for Google Authentication service
 * ISP: Each interface has a single, clear purpose
 */
export interface IGoogleAuth {
  /**
   * Gets an authenticated OAuth2 client
   * @returns Promise resolving to authenticated client
   */
  getAuthenticatedClient(): Promise<OAuth2Client>;

  /**
   * Checks if we have valid credentials
   * @returns Promise resolving to boolean
   */
  isAuthenticated(): Promise<boolean>;
}
