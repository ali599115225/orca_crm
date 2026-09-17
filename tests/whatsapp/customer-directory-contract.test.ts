import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const directoryAction = readFileSync(
  resolve(process.cwd(), "app/actions/whatsapp-customer-directory.ts"),
  "utf8",
);
const view = readFileSync(
  resolve(process.cwd(), "components/views/WhatsAppView.tsx"),
  "utf8",
);

describe("WhatsApp customer-directory lifecycle contract", () => {
  it("keeps customer identity independent from assignment, tasks, and lead archive state", () => {
    expect(directoryAction).toContain("prisma.lead.findMany");
    expect(directoryAction).toContain("prisma.contact.findMany");
    expect(directoryAction).toContain("prisma.whatsAppContact.findMany");
    expect(directoryAction).not.toContain("prisma.task");
    expect(directoryAction).not.toContain("isArchived: false");
    expect(directoryAction).not.toContain("assignedTo: {");
    expect(directoryAction).toContain("assignedUserName:");
  });

  it("surfaces open, previous, and no-conversation states without deleting the customer from search", () => {
    expect(directoryAction).toContain('conversationStatus: "OPEN" | "ARCHIVED" | "NONE"');
    expect(view).toContain("customerOpenConversation");
    expect(view).toContain("customerArchivedConversation");
    expect(view).toContain("customerNoConversation");
    expect(view).toContain("customerArchivedRecord");
  });

  it("reopens a previous archived conversation only after a successful outbound message", () => {
    expect(view).toContain("customerToReopen?.contactId");
    expect(view).toContain('customerToReopen.conversationStatus === "ARCHIVED"');
    expect(view).toContain("archiveChatAction(customerToReopen.contactId)");
    expect(view).toContain("else if (selectedChat.archived)");
    expect(view).toContain("archiveChatAction(selectedChat.id)");
    expect(view).toContain('fetchFreshChats("active")');
  });

  it("keeps manual external-number entry and does not infer a country for unrecognized stored numbers", () => {
    expect(view).toContain('type="tel"');
    expect(view).toContain("const split = splitInternationalPhone(customer.phone);");
    expect(view).toContain("setNewPhone(normalizeLocalPhone(customer.phone));");
    expect(view).not.toContain("setNewCountryCode(\"966\"); // customer fallback");
  });

  it("uses an accessible ORCA menu instead of the browser-native datalist", () => {
    expect(view).not.toContain("<datalist");
    expect(view).toContain('role="combobox"');
    expect(view).toContain('aria-autocomplete="list"');
    expect(view).toContain('aria-activedescendant=');
    expect(view).toContain('role="listbox"');
    expect(view).toContain('role="option"');
    expect(view).toContain('scrollRole="menu"');
    expect(view).toContain("scrollIntoView({ block: \"nearest\" })");
    expect(view).toContain('data-whatsapp-customer-directory');
    expect(view).toContain('className="mt-2 overflow-hidden rounded-xl');
    expect(view).toContain('style={{ maxHeight: "168px" }}');
    expect(view).not.toContain('className="absolute inset-x-0 top-[calc(100%+6px)]');
    expect(view).not.toContain('className="max-h-64');
  });

  it("keeps actual sending fail-closed while disconnected and offers connection CTAs instead of dead send controls", () => {
    expect(view).toContain("if (!whatsAppReachable) {");
    expect(view).toContain("toast.error(t.notConfigured);");
    expect(view).toContain("setNewChatError(t.notConfigured);");
    expect(view).toContain("t.connectToSend");
    expect(view).not.toContain('disabled={!whatsAppReachable || isSending}');
    expect(view).not.toContain('disabled={isCreatingChat || !whatsAppReachable}');
  });
});
