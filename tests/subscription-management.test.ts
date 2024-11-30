import { describe, it, expect } from "vitest";
import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v1.5.0/index.ts";

describe("Subscription Management Contract", () => {
  it("creates a new subscription", async () => {
    const accounts = await Clarinet.getAccounts();
    const deployer = accounts.get("deployer")!;
    const merchant = accounts.get("wallet_1")!;
    const subscriber = accounts.get("wallet_2")!;

    // Create the subscription
    let block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "create-subscription",
        [types.principal(merchant.address), types.uint(100), types.uint(10)],
        subscriber.address
      ),
    ]);

    // Assert successful subscription creation
    expect(block.receipts.length).toBe(1);
    expect(block.receipts[0].result.ok).toBe(1);
  });

  it("processes subscription payment", async () => {
    const accounts = await Clarinet.getAccounts();
    const merchant = accounts.get("wallet_1")!;
    const subscriber = accounts.get("wallet_2")!;

    // Create a subscription first
    let block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "create-subscription",
        [types.principal(merchant.address), types.uint(100), types.uint(10)],
        subscriber.address
      ),
    ]);

    // Mine additional blocks to simulate time passing (15 blocks)
    await Clarinet.mineEmptyBlock(15);

    // Process the subscription payment
    block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "process-subscription",
        [types.principal(subscriber.address), types.uint(1)],
        subscriber.address
      ), // Payment is processed by the subscriber
    ]);

    // Assert successful payment
    expect(block.receipts.length).toBe(1);
    expect(block.receipts[0].result.ok).toBe(true);
  });

  it("cancels a subscription", async () => {
    const accounts = await Clarinet.getAccounts();
    const merchant = accounts.get("wallet_1")!;
    const subscriber = accounts.get("wallet_2")!;

    // Create the subscription first
    let block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "create-subscription",
        [types.principal(merchant.address), types.uint(100), types.uint(10)],
        subscriber.address
      ),
    ]);

    // Cancel the subscription
    block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "cancel-subscription",
        [types.uint(1)],
        subscriber.address
      ),
    ]);

    // Assert successful cancellation
    expect(block.receipts.length).toBe(1);
    expect(block.receipts[0].result.ok).toBe(true);
  });

  it("retrieves subscription details", async () => {
    const accounts = await Clarinet.getAccounts();
    const merchant = accounts.get("wallet_1")!;
    const subscriber = accounts.get("wallet_2")!;

    // Create the subscription first
    let block = await Clarinet.mineBlock([
      Tx.contractCall(
        "subscription-management",
        "create-subscription",
        [types.principal(merchant.address), types.uint(100), types.uint(10)],
        subscriber.address
      ),
    ]);

    // Read subscription details
    const subscription = await Clarinet.callReadOnlyFn(
      "subscription-management",
      "get-subscription",
      [types.principal(subscriber.address), types.uint(1)],
      subscriber.address
    );

    // Assert subscription details are correct
    expect(subscription.result.some).toBeTruthy();
  });
});
