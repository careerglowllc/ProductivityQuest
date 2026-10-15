import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { domainAccountDetail, domainAfterTax } from "./domain-value";

test("the after-tax value is the sale price less 15% tax on the gain over what was paid", () => {
  assert.equal(domainAfterTax(4500, 4001.17), 4500 - 498.83 * 0.15);
  assert.equal(Math.round(domainAfterTax(4500, 4001.17)), 4425, "the figure the net worth column shows");
});

test("a domain worth less than was paid has no gain to tax", () => {
  assert.equal(domainAfterTax(1600, 4001.17), 1600);
  assert.equal(domainAfterTax(4001.17, 4001.17), 4001.17);
  assert.equal(domainAfterTax(0, 4001.17), 0);
});

test("the account line shows the same net worth and sale price as the net worth column", () => {
  assert.equal(domainAccountDetail(4500, 4001.17), "Domain registrar · veluna.com · est. net worth $4,425 after tax · est. sale price $4,500");
  assert.match(domainAccountDetail(1600, 4001.17), /est\. net worth \$1,600 after tax · est\. sale price \$1,600$/);
  assert.match(domainAccountDetail(12345.6, 4000), /est\. sale price \$12,346$/);
});

test("the Accounts tab and net worth both read the one saved domain value, with no typed-in figure left", () => {
  const page = readFileSync(new URL("../pages/finances.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("detail: domainAccountDetail(velunaDomainValue, velunaDomainPurchasePrice)"));
  assert.ok(page.includes("const _domainAfterTax = domainAfterTax(velunaDomainValue, velunaDomainPurchasePrice)"));
  assert.ok(!page.includes("est. value $2,500"));
  assert.equal((page.match(/localStorage\.getItem\("nw-veluna-domain"\)/g) ?? []).length, 1, "the value is loaded in one place");
});
