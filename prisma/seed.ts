import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const at = (daysAgo: number, hour: number, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const base = { status: "completed", source: "self_reported" };
const agentIds: Record<string, string> = {
  "Codex": "codex",
  "Hermes · Scout": "hermes-scout",
  "Muse · Maya": "muse-maya",
  "Claude · Cal": "claude-cal",
  "OpenClaw · Penny": "openclaw-penny",
  "Grokbot · Tabi": "grokbot-tabi",
  "Instinct · Iris": "instinct-iris",
};

const actions = [
  { agentName:"Codex", verb:"pushed", summary:"Pushed the responsive agent feed and action detail drawer.", category:"code", system:"GitHub", objectType:"commit", objectName:"8ab214f", project:"Monologue", externalId:"commit-8ab214f", url:"https://github.com/example/monologue/commit/8ab214f", occurredAt:at(0,14,43) },
  { agentName:"Muse · Maya", verb:"sent", summary:"Sent Sarah a follow-up email confirming Friday's interview time.", category:"communication", system:"Gmail", objectType:"email", objectName:"Friday interview follow-up", project:"Job Search", externalId:"gmail-101", occurredAt:at(0,13,17) },
  { agentName:"OpenClaw · Penny", verb:"purchased", summary:"Purchased two black printer toner cartridges.", category:"purchase", system:"Amazon", objectType:"order", objectName:"Printer toner", value:47.18, currency:"USD", externalId:"amazon-7741", url:"https://amazon.com/orders/7741", occurredAt:at(0,11,4) },
  { agentName:"Claude · Cal", verb:"rescheduled", summary:"Moved the dentist appointment from Tuesday to Thursday.", category:"calendar", system:"Google Calendar", objectType:"event", objectName:"Dentist appointment", project:"Personal", externalId:"gcal-dentist-2", occurredAt:at(0,9,22) },
  { agentName:"Hermes · Scout", verb:"updated", summary:"Updated the launch checklist with final release owners.", category:"file", system:"Notion", objectType:"page", objectName:"Monologue launch checklist", project:"Monologue", externalId:"notion-launch-4", occurredAt:at(0,8,46) },
  { agentName:"Grokbot · Tabi", verb:"booked", summary:"Failed to book the United flight because the fare changed before checkout.", category:"reservation", status:"failed", system:"United", objectType:"flight", objectName:"SFO → HND", project:"Tokyo Trip", externalId:"ua-attempt-72", occurredAt:at(0,8,12), metadata:{ reason:"fare_changed", quotedFare:986.40 } },
  { agentName:"Instinct · Iris", verb:"booked", summary:"Booked a ride to SFO for the Tokyo flight.", category:"reservation", system:"Uber", objectType:"ride", objectName:"Home → SFO", project:"Tokyo Trip", value:62.35, currency:"USD", externalId:"uber-reservation-204", occurredAt:at(0,7,55) },
  { agentName:"Codex", verb:"merged", summary:"Merged PR #41 adding portfolio filtering.", category:"code", system:"GitHub", objectType:"pull_request", objectName:"PR #41", project:"AI Hedge Fund Analyst", externalId:"pr-41-merge", url:"https://github.com/example/hedge-fund/pull/41", occurredAt:at(1,18,35) },
  { agentName:"Claude · Cal", verb:"created", summary:"Added airport pickup to the arrival-day calendar.", category:"calendar", system:"Google Calendar", objectType:"event", objectName:"Airport pickup at HND", project:"Tokyo Trip", externalId:"gcal-tokyo-pickup", occurredAt:at(1,16,5) },
  { agentName:"Muse · Maya", verb:"cancelled", summary:"Cancelled the old dinner reservation after the itinerary changed.", category:"reservation", system:"Gmail", objectType:"reservation", objectName:"Dinner at Den", project:"Tokyo Trip", externalId:"gmail-den-cancel", occurredAt:at(1,15,32) },
  { agentName:"Hermes · Scout", verb:"deployed", summary:"Deployed the latest API changes to production.", category:"deployment", system:"GitHub", objectType:"deployment", objectName:"production", project:"AI Hedge Fund Analyst", externalId:"deploy-883", url:"https://github.com/example/hedge-fund/deployments/883", occurredAt:at(1,13,44) },
  { agentName:"OpenClaw · Penny", verb:"purchased", summary:"Purchased a compact travel adapter for Japan.", category:"purchase", system:"Amazon", objectType:"order", objectName:"Universal travel adapter", project:"Tokyo Trip", value:29.99, currency:"USD", externalId:"amazon-7750", occurredAt:at(1,11,20) },
  { agentName:"Muse · Maya", verb:"sent", summary:"Sent a thank-you note to the hiring manager.", category:"communication", system:"Gmail", objectType:"email", objectName:"Thank you — product interview", project:"Job Search", externalId:"gmail-102", occurredAt:at(1,9,10) },
  { agentName:"Codex", verb:"created", summary:"Created the initial SQLite action schema and migration.", category:"database", system:"GitHub", objectType:"file", objectName:"schema.prisma", project:"Monologue", externalId:"commit-schema-1", url:"https://github.com/example/monologue/commit/11ca02", occurredAt:at(2,17,23) },
  { agentName:"Grokbot · Tabi", verb:"booked", summary:"Booked a refundable room in Shinjuku for five nights.", category:"reservation", system:"United", objectType:"hotel", objectName:"Shinjuku hotel", project:"Tokyo Trip", value:1124.00, currency:"USD", externalId:"hotel-3308", occurredAt:at(2,14,8) },
  { agentName:"Claude · Cal", verb:"created", summary:"Added the final-round interview and prep buffer.", category:"calendar", system:"Google Calendar", objectType:"event", objectName:"Final interview", project:"Job Search", externalId:"gcal-interview-final", occurredAt:at(2,10,0) },
  { agentName:"Hermes · Scout", verb:"updated", summary:"Updated the product brief with the V1 product rules.", category:"file", system:"Notion", objectType:"page", objectName:"Monologue product brief", project:"Monologue", externalId:"notion-brief-9", occurredAt:at(3,19,12) },
  { agentName:"OpenClaw · Penny", verb:"purchased", summary:"Purchased noise-cancelling headphones for the flight.", category:"purchase", system:"Amazon", objectType:"order", objectName:"Travel headphones", project:"Tokyo Trip", value:189.00, currency:"USD", externalId:"amazon-7722", occurredAt:at(3,16,45) },
  { agentName:"Codex", verb:"closed", summary:"Closed issue #18 after fixing stale portfolio prices.", category:"code", system:"GitHub", objectType:"issue", objectName:"Issue #18", project:"AI Hedge Fund Analyst", externalId:"issue-18-close", url:"https://github.com/example/hedge-fund/issues/18", occurredAt:at(3,14,30) },
  { agentName:"Muse · Maya", verb:"submitted", summary:"Submitted the product lead application to Northstar Labs.", category:"form", system:"Notion", objectType:"application", objectName:"Northstar Labs application", project:"Job Search", externalId:"application-northstar", occurredAt:at(4,15,7) },
  { agentName:"Hermes · Scout", verb:"charged", summary:"Created the September software subscription charge.", category:"finance", system:"Stripe", objectType:"payment", objectName:"September subscription", project:"Personal", value:24.00, currency:"USD", externalId:"pi_92001", url:"https://dashboard.stripe.com/payments/pi_92001", occurredAt:at(4,11,18) },
  { agentName:"Instinct · Iris", verb:"sent", summary:"Texted the building manager and scheduled a handyman visit.", category:"communication", system:"Messages", objectType:"message", objectName:"Handyman scheduling", project:"Personal", externalId:"message-handyman-18", occurredAt:at(4,9,42) },
  { agentName:"Grokbot · Tabi", verb:"cancelled", summary:"Cancelled the backup United itinerary before the hold expired.", category:"reservation", system:"United", objectType:"flight", objectName:"Backup SFO → NRT", project:"Tokyo Trip", externalId:"ua-cancel-191", occurredAt:at(5,18,2) },
  { agentName:"Claude · Cal", verb:"updated", summary:"Changed the weekly portfolio review to 30 minutes.", category:"calendar", system:"Google Calendar", objectType:"event", objectName:"Portfolio review", project:"AI Hedge Fund Analyst", externalId:"gcal-portfolio-review", occurredAt:at(5,12,0) },
  { agentName:"Codex", verb:"pushed", summary:"Pushed a fix for currency formatting in transaction cards.", category:"code", system:"GitHub", objectType:"commit", objectName:"40ff2e1", project:"AI Hedge Fund Analyst", externalId:"commit-40ff2e1", url:"https://github.com/example/hedge-fund/commit/40ff2e1", occurredAt:at(6,16,33) },
  { agentName:"Muse · Maya", verb:"sent", summary:"Failed to send a recruiter reply because the address bounced.", category:"communication", status:"failed", system:"Gmail", objectType:"email", objectName:"Recruiter availability", project:"Job Search", externalId:"gmail-bounce-22", occurredAt:at(6,10,25), metadata:{ reason:"address_not_found" } },
  { agentName:"OpenClaw · Penny", verb:"returned", summary:"Started a return for the incorrectly sized carry-on organizer.", category:"purchase", system:"Amazon", objectType:"return", objectName:"Carry-on organizer", project:"Tokyo Trip", value:18.50, currency:"USD", externalId:"amazon-return-91", occurredAt:at(7,13,48) },
  { agentName:"Hermes · Scout", verb:"created", summary:"Created a shared launch notes page.", category:"file", system:"Notion", objectType:"page", objectName:"Launch notes", project:"Monologue", externalId:"notion-launch-notes", occurredAt:at(8,15,15) },
  { agentName:"Codex", verb:"opened", summary:"Opened PR #7 with mobile feed refinements.", category:"code", system:"GitHub", objectType:"pull_request", objectName:"PR #7", project:"Monologue", externalId:"pr-7-open", url:"https://github.com/example/monologue/pull/7", occurredAt:at(8,11,9) },
  { agentName:"Grokbot · Tabi", verb:"booked", summary:"Booked seats 21A and 21C on the outbound flight.", category:"reservation", system:"United", objectType:"seat", objectName:"Outbound seat selection", project:"Tokyo Trip", value:92.00, currency:"USD", externalId:"ua-seats-21ac", occurredAt:at(9,17,41) },
  { agentName:"Muse · Maya", verb:"updated", summary:"Updated the application tracker with the onsite outcome.", category:"crm", system:"Notion", objectType:"database_record", objectName:"Northstar Labs", project:"Job Search", externalId:"notion-job-northstar", occurredAt:at(10,12,22) },
  { agentName:"Claude · Cal", verb:"deleted", summary:"Removed the cancelled portfolio planning session.", category:"calendar", system:"Google Calendar", objectType:"event", objectName:"Portfolio planning", project:"AI Hedge Fund Analyst", externalId:"gcal-delete-planning", occurredAt:at(11,9,5) },
  { agentName:"Hermes · Scout", verb:"refunded", summary:"Failed to issue a duplicate-payment refund because the charge was disputed.", category:"finance", status:"failed", system:"Stripe", objectType:"refund", objectName:"Duplicate charge refund", project:"Personal", value:64.00, currency:"USD", externalId:"refund-failed-3", occurredAt:at(12,14,39) },
  { agentName:"OpenClaw · Penny", verb:"updated", summary:"Changed the default shipping address for future orders.", category:"account", system:"Amazon", objectType:"setting", objectName:"Shipping address", project:"Personal", externalId:"amazon-address-3", occurredAt:at(13,8,54) },
].map((action) => ({ ...base, ...action, agentId: agentIds[action.agentName] }));

async function main() {
  await prisma.action.deleteMany();
  await prisma.action.createMany({ data: actions });
  console.log(`Seeded ${actions.length} consequential actions.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
