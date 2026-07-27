export interface ChallengeDelivery {
  challengeId: string;
  channel: "PHONE" | "EMAIL" | "EXTERNAL_SUBJECT";
  destinationReference: string;
  token: string;
  expiresAt: Date;
}

export interface CustomerChallengeProviderAdapter {
  deliver(input: ChallengeDelivery): Promise<{ providerMessageId: string }>;
}

export class InMemoryCustomerChallengeAdapter implements CustomerChallengeProviderAdapter {
  readonly deliveries: ChallengeDelivery[] = [];
  async deliver(input: ChallengeDelivery): Promise<{ providerMessageId: string }> {
    this.deliveries.push(input);
    return { providerMessageId: `test:${input.challengeId}` };
  }
}
