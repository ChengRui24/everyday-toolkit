"use strict";

const field = id => document.getElementById(id);
const selected = name => document.querySelector('input[name="' + name + '"]:checked').value;
const number = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const grams = value => value > 0 && value < 0.005 ? "< 0.01 g" : number.format(value) + " g";
const waterDensity = 0.998;
const monohydrateFactor = 192.12 / 210.14;

const stockUnits = {
  ww: {label: "原液质量分数（%）", example: "例如 30% w/w 表示每 100 g 原液含 30 g 柠檬酸。标签只写百分比时，请核对产品说明中的单位。", placeholder: "例如 30"},
  wv: {label: "每 100 mL 原液含柠檬酸（g）", example: "例如标签写 30% w/v 或 30 g/100 mL，填 30。", placeholder: "例如 30"},
  gl: {label: "每升原液含柠檬酸（g）", example: "例如标签写 300 g/L，填 300。", placeholder: "例如 300"},
};

function update() {
  const liquid = selected("form") === "liquid";
  field("solid-type").hidden = liquid;
  field("solid-content").hidden = liquid;
  field("stock-fields").hidden = !liquid;
  field("quantity-label").textContent = liquid ? "需要添加的柠檬酸原液" : "需要添加的柠檬酸固体";
  const mode = field("mode").value;
  const dose = mode === "dose";
  const target = field("target").valueAsNumber;
  const waterUnits = {ml: waterDensity, g: 1, l: 1000 * waterDensity};
  const water = field("water").valueAsNumber * waterUnits[selected("unit")];
  const unit = field("stock-unit").value;
  const perVolume = liquid && unit !== "ww";
  const density = field("density");
  const strength = field("strength").valueAsNumber;
  field("strength-label").textContent = stockUnits[unit].label;
  field("strength").placeholder = stockUnits[unit].placeholder;
  field("stock-help").textContent = stockUnits[unit].example;
  field("stock-presets").hidden = unit !== "ww";
  field("density-label").textContent = perVolume
    ? "原液密度（g/mL，换算质量分数必填）" : "原液密度（g/mL，仅换算体积时填写）";
  let purity = liquid ? strength / 100 : field("purity").valueAsNumber / 100;
  if (perVolume) purity = strength / (unit === "gl" ? 1000 : 100) / density.valueAsNumber;
  document.querySelectorAll("[data-strength]").forEach(button => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.strength) === strength));
  });
  const type = liquid ? field("stock-basis").value : selected("type");
  const acidFraction = purity * (type === "mono" ? monohydrateFactor : 1);
  const basis = mode === "material" ? purity : acidFraction;
  const labels = {
    effective: "目标有效酸浓度（%）", material: "目标原料质量分数（%）",
    dose: liquid ? "每 100 mL 水加原液（g）" : "每 100 mL 水加粉（g）",
  };
  field("mode").querySelector('[value="dose"]').textContent =
    liquid ? "按说明书每 100 mL 水的原液质量" : "按说明书每 100 mL 水的投粉量";
  field("target-label").textContent = liquid && !dose ? "稀释后" + labels[mode] : labels[mode];
  field("range-controls").hidden = dose;
  if (!dose && Number.isFinite(target)) field("slider").value = target;
  document.querySelectorAll("[data-preset]").forEach(button => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.preset) === target));
  });

  const addedMass = dose ? water / waterDensity * target / 100 : water * target / (basis * 100 - target);
  let error = "";
  if (liquid && !(strength > 0)) {
    error = "请选择或填写瓶身标签上的原液浓度。";
  } else if (perVolume && !(density.valueAsNumber > 0)) {
    error = "请填写原液密度，以便把标签浓度换算为质量分数。";
  } else if (liquid && purity > 1) {
    error = "换算后的质量分数超过 100%，请核对浓度单位和原液密度。";
  } else if (!(water > 0 && target > 0 && purity > 0 && purity <= 1)) {
    error = liquid ? "请填写水量、用量和原液标签的质量分数（大于 0% 且不超过 100%）。" : "请输入正数，原料纯度应大于 0% 且不超过 100%。";
  } else if (!dose && target >= basis * 100) {
    error = "目标浓度须低于原料在当前口径下的浓度，才能通过加水配制。";
  } else if (!Number.isFinite(water + addedMass) || addedMass <= 0) {
    error = "数值超出可计算范围。";
  }

  field("result").value = error ? "—" : grams(addedMass);
  const volume = field("volume");
  volume.hidden = !liquid || Boolean(error);
  if (!volume.hidden) {
    if (density.validity.badInput || (density.value && !(density.valueAsNumber > 0))) {
      volume.textContent = "密度须为正数，才能换算原液体积。";
    } else if (density.value) {
      const ml = addedMass / density.valueAsNumber;
      volume.textContent = Number.isFinite(ml)
        ? "原液体积约 " + (ml < 0.005 ? "< 0.01" : number.format(ml)) + " mL"
        : "原液体积超出可计算范围。";
    } else {
      volume.textContent = "可直接按克称量；填写原液密度后可查看毫升数。";
    }
  }
  field("total").textContent = error ? "—" : grams(water + addedMass);
  field("acid").textContent = error ? "—" : grams(addedMass * acidFraction);
  field("ratio").textContent = error || (liquid ? "水与原液质量比　" : "水与粉末质量比　") + number.format(water / addedMass) + " : 1";
}

field("calculator").addEventListener("input", event => {
  if (event.target.id === "stock-unit") field("strength").value = "";
  if (event.target.id === "slider") field("target").value = event.target.value;
  update();
});
document.querySelectorAll("[data-strength]").forEach(button => {
  button.addEventListener("click", () => {
    field("strength").value = button.dataset.strength;
    update();
  });
});
document.querySelectorAll("[data-dose], [data-percent], [data-preset]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.hasAttribute("data-preset")) {
      field("target").value = button.dataset.preset;
    } else {
      document.querySelector('input[name="form"][value="solid"]').checked = true;
      const dose = button.hasAttribute("data-dose");
      field("mode").value = dose ? "dose" : "effective";
      field("target").value = dose ? button.dataset.dose : button.dataset.percent;
      if (!dose) {
        document.querySelector('input[value="mono"]').checked = true;
        field("purity").value = "99";
      }
      location.hash = "calculator";
      field("water").focus({preventScroll:true});
    }
    update();
  });
});
update();
