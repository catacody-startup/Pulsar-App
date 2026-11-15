/**
 * The habitat server: a small computer on the habitat's local network that
 * keeps the crew's data, so every tablet and phone sees the same and nothing
 * is lost if a device breaks. In the prototype it runs next to the web app.
 */
export const HABITAT_SERVER = {
  /** Check-ins kept per crew member, in sols. */
  keepSols: 30,
  /** A check-in can be for the sol in progress or up to this many sols back (a device that was offline). */
  acceptSolsBack: 1,
  /** Writes allowed per client per minute. */
  writesPerMinute: 30,
  /** Largest request body accepted, bytes. */
  maxBodyBytes: 4096,
  /** Devices that can follow the live updates at the same time. */
  maxStreamClients: 200,
  /** Keep-alive on the live updates, seconds (proxies close silent connections). */
  keepAliveSeconds: 25,
  /** How often a device retries sending the changes waiting on it, seconds. */
  retrySeconds: 15,
};
