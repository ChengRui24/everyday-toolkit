"use strict";

const units = {
  "km-mi": [1 / 1.609344, 0, "英里"],
  "mi-km": [1.609344, 0, "公里"],
  "kg-lb": [1 / 0.45359237, 0, "磅"],
  "lb-kg": [0.45359237, 0, "千克"],
  "c-f": [9 / 5, 32, "°F"],
  "f-c": [5 / 9, -32 * 5 / 9, "°C"],
};

const number = new Intl.NumberFormat("zh-CN", { maximumSignificantDigits: 8 });
const money = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function convert(form) {
  const [factor, offset, unit] = units[form.elements.unit.value];
  const result = form.elements.amount.valueAsNumber * factor + offset;
  return Number.isFinite(result) ? `${number.format(result)} ${unit}` : "数值超出可换算范围。";
}

function price(form) {
  const grams = form.elements.grams.valueAsNumber;
  if (grams <= 0) return "重量必须大于 0。";
  const result = form.elements.amount.valueAsNumber / (grams / 1000);
  return Number.isFinite(result) ? `每千克 ${money.format(result)}` : "数值超出可计算范围。";
}

function split(form) {
  const cents = Math.round(form.elements.amount.valueAsNumber * 100);
  const people = form.elements.people.valueAsNumber;
  const share = Math.floor(cents / people);
  const remainder = cents % people;
  if (remainder === 0) return `每人 ${money.format(share / 100)}`;
  return `${remainder} 人各付 ${money.format((share + 1) / 100)}，其余 ${people - remainder} 人各付 ${money.format(share / 100)}`;
}

for (const calculate of [convert, price, split]) {
  const form = document.getElementById(calculate.name);
  const output = form.querySelector("output");
  form.addEventListener("input", () => { output.value = ""; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    output.value = calculate(form);
  });
}
