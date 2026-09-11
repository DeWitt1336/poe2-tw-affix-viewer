(() => {
  "use strict";

  const DATA = window.POE2_AFFIX_DATA;
  const $ = (id) => document.getElementById(id);
  const input = $("itemText");
  const status = $("status");
  const FORCED_DOMAINS = new Set(["essence", "perfect_essence", "abyss"]);

  const CATEGORY_ALIASES = {
    "Body Armours": "Body_Armours", "Body Armour": "Body_Armours",
    "Helmets": "Helmets", "Helmet": "Helmets", "Gloves": "Gloves", "Boots": "Boots",
    "Belts": "Belts", "Belt": "Belts", "Rings": "Rings", "Ring": "Rings",
    "Amulets": "Amulets", "Amulet": "Amulets", "Bows": "Bows", "Bow": "Bows",
    "Crossbows": "Crossbows", "Crossbow": "Crossbows", "Wands": "Wands", "Wand": "Wands",
    "Staves": "Staves", "Staff": "Staves", "One Hand Swords": "One_Hand_Swords",
    "One Hand Sword": "One_Hand_Swords", "Two Hand Swords": "Two_Hand_Swords",
    "Two Hand Sword": "Two_Hand_Swords", "One Hand Axes": "One_Hand_Axes",
    "One Hand Axe": "One_Hand_Axes", "Two Hand Axes": "Two_Hand_Axes",
    "Two Hand Axe": "Two_Hand_Axes", "One Hand Maces": "One_Hand_Maces",
    "One Hand Mace": "One_Hand_Maces", "Two Hand Maces": "Two_Hand_Maces",
    "Two Hand Mace": "Two_Hand_Maces", "Daggers": "Daggers", "Dagger": "Daggers",
    "Claws": "Claws", "Claw": "Claws", "Quarterstaves": "Quarterstaves",
    "Quarterstaff": "Quarterstaves", "Spears": "Spears", "Spear": "Spears",
    "Flails": "Flails", "Flail": "Flails", "Sceptres": "Sceptres", "Sceptre": "Sceptres",
    "Shields": "Shields", "Shield": "Shields", "Bucklers": "Bucklers", "Buckler": "Bucklers",
    "Foci": "Foci", "Focus": "Foci", "Quivers": "Quivers", "Quiver": "Quivers"
  };

  for (const [category, labels] of Object.entries(DATA.meta.classLabels || {})) {
    const base = category.replace(/_(str|dex|int)(_(dex|int))?$/, "");
    if (labels.en) CATEGORY_ALIASES[labels.en] = base;
    if (labels.zh) CATEGORY_ALIASES[labels.zh] = base;
  }

  const LABELS = {
    itemClass: ["Item Class", "物品種類", "物品种类", "物品類別", "物品类别"],
    rarity: ["Rarity", "稀有度"],
    itemLevel: ["Item Level", "物品等級", "物品等级"]
  };

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function labeledValue(lines, labels) {
    const pattern = new RegExp(`^(?:${labels.map(escapeRegex).join("|")}):\\s*(.+)$`, "i");
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) return match[1].trim();
    }
    return "";
  }

  function detectAttributes(text) {
    const armour = /^(?:Armour|護甲|护甲):\s*\d+/mi.test(text);
    const evasion = /^(?:Evasion Rating|閃避值|闪避值|閃避|闪避):\s*\d+/mi.test(text);
    const energy = /^(?:Energy Shield|能量護盾|能量护盾):\s*\d+/mi.test(text);
    if (armour && evasion) return "str_dex";
    if (armour && energy) return "str_int";
    if (evasion && energy) return "dex_int";
    if (armour) return "str";
    if (evasion) return "dex";
    if (energy) return "int";
    const req = text.match(/^(?:Requires|需求):\s*(.+)$/mi)?.[1] || "";
    const str = /\bStr\b|力量/i.test(req);
    const dex = /\bDex\b|敏捷/i.test(req);
    const int = /\bInt\b|智慧/i.test(req);
    if (str && dex) return "str_dex";
    if (str && int) return "str_int";
    if (dex && int) return "dex_int";
    if (str) return "str";
    if (dex) return "dex";
    if (int) return "int";
    return "str";
  }

  function parseNameAndBase(lines, rarity) {
    const rarityPattern = new RegExp(`^(?:${LABELS.rarity.map(escapeRegex).join("|")}):`, "i");
    const start = lines.findIndex((line) => rarityPattern.test(line));
    if (start < 0) return { name: "", baseType: "" };
    const names = [];
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^-{8,}$/.test(lines[i])) break;
      if (lines[i]) names.push(lines[i]);
    }
    const rare = /^(?:Rare|Unique|稀有|傳奇|传奇)$/i.test(rarity);
    return rare && names.length > 1
      ? { name: names[0], baseType: names[1] }
      : { name: names[0] || "", baseType: names[0] || "" };
  }

  function parseItem(text) {
    const normalized = String(text || "").replace(/\r/g, "").trim();
    const lines = normalized.split("\n").map((line) => line.trim());
    const itemClass = labeledValue(lines, LABELS.itemClass);
    const rarity = labeledValue(lines, LABELS.rarity);
    const levelRaw = labeledValue(lines, LABELS.itemLevel);
    const itemLevel = Number.parseInt(levelRaw.match(/\d+/)?.[0] || "0", 10);
    if (!itemClass || !rarity) throw new Error("找不到「Item Class / 物品種類」或「Rarity / 稀有度」。請貼上完整的 Copy Item Text。");
    if (!itemLevel) throw new Error("找不到有效的 Item Level / 物品等級。");
    const baseCategory = CATEGORY_ALIASES[itemClass];
    if (!baseCategory) throw new Error(`目前不支援此物品種類：${itemClass}`);
    const attrCategories = new Set(["Body_Armours", "Boots", "Gloves", "Helmets", "Shields"]);
    const category = attrCategories.has(baseCategory) ? `${baseCategory}_${detectAttributes(normalized)}` : baseCategory;
    if (!DATA.categories[category]) throw new Error(`已識別物品，但找不到對應詞綴資料：${category}`);
    return { ...parseNameAndBase(lines, rarity), itemClass, rarity, itemLevel, category, normalized, lines };
  }

  function signature(value) {
    return String(value || "")
      .replace(/\((?:implicit|enchant|rune|crafted)\)/gi, "")
      .replace(/-?\d+(?:\.\d+)?/g, "#")
      .replace(/[+%()—–-]/g, "")
      .replace(/#+/g, "#")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function numberTokens(value) {
    return (String(value || "").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  }

  function transplantNumbers(template, actual) {
    const values = numberTokens(actual);
    let index = 0;
    const collapsed = template.replace(/\(-?\d+(?:\.\d+)?[—–-]-?\d+(?:\.\d+)?\)/g, (match) => values[index++] ?? match);
    return collapsed.replace(/-?\d+(?:\.\d+)?/g, (match) => values[index++] ?? match);
  }

  function numericSlots(value) {
    const slots = [];
    const pattern = /(-?\d+(?:\.\d+)?)(?:\s*[—–]\s*(-?\d+(?:\.\d+)?))?/g;
    for (const match of String(value || "").matchAll(pattern)) {
      const first = Number(match[1]);
      const second = match[2] === undefined ? first : Number(match[2]);
      slots.push([Math.min(first, second), Math.max(first, second)]);
    }
    return slots;
  }

  function rangeDistance(template, actual) {
    const slots = numericSlots(template);
    const values = numberTokens(actual);
    if (!slots.length || slots.length !== values.length) return Number.POSITIVE_INFINITY;
    return slots.reduce((distance, [minimum, maximum], index) => {
      const value = values[index];
      if (value < minimum) return distance + minimum - value;
      if (value > maximum) return distance + value - maximum;
      return distance;
    }, 0);
  }

  function translationIndex(category) {
    const index = new Map();
    const add = (key, record) => {
      if (!key) return;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(record);
    };
    for (const [domain, groups] of Object.entries(DATA.categories[category] || {})) {
      for (const group of groups) {
        for (const tier of group.tiers) {
          const record = {
            text: tier.text, textEn: tier.textEn, side: group.side, domain,
            tier: tier.tier, family: group.family, ilvl: tier.ilvl
          };
          if (tier.textEn) add(signature(tier.textEn), record);
          add(signature(tier.text), record);
        }
      }
    }
    return index;
  }

  function matchExisting(value, index) {
    const candidates = index.get(signature(value)) || [];
    if (!candidates.length) return null;
    const priority = (candidate) => candidate.domain === "normal" ? 0 : 1;
    return [...candidates]
      .map((candidate) => ({ candidate, distance: Math.min(
        rangeDistance(candidate.text, value),
        rangeDistance(candidate.textEn, value)
      ) }))
      .sort((a, b) => a.distance - b.distance || priority(a.candidate) - priority(b.candidate) || a.candidate.tier - b.candidate.tier)[0].candidate;
  }

  function extractExistingModifiers(item) {
    const levelPattern = new RegExp(`^(?:${LABELS.itemLevel.map(escapeRegex).join("|")}):`, "i");
    const start = item.lines.findIndex((line) => levelPattern.test(line));
    if (start < 0) return [];
    const index = translationIndex(item.category);
    const results = [];
    let pending = null;
    let pendingLines = [];
    const separator = /^-{8,}$/;
    const skip = /^(?:Corrupted|Unidentified|Mirrored|Sanctified|已汙染|未鑑定|複製品|Note:|備註:|Item sells for:|物品售價:)/i;
    const metadata = /^(?:Sockets|插槽|Quality|品質|Item Level|物品等級|物品等级):/i;
    const header = /^\{.*\bModifier\b.*\}$/i;
    const cleanLine = (line) => line.replace(/\s*\((?:implicit|enchant|rune|crafted)\)\s*$/i, "").trim();
    const translateLine = (line) => {
      const matched = matchExisting(line, index);
      return matched && /[A-Za-z]{3}/.test(line) ? transplantNumbers(matched.text, line) : line;
    };
    const append = (lines, details = null) => {
      if (!lines.length) return;
      const cleaned = lines.map(cleanLine).filter(Boolean);
      if (!cleaned.length) return;
      const combined = cleaned.join("");
      const matched = matchExisting(combined, index);
      const implicit = lines.some((line) => /\((?:implicit|enchant)\)/i.test(line));
      const translated = cleaned.length > 1
        ? cleaned.map(translateLine).join(" ／ ")
        : translateLine(cleaned[0]);
      results.push({
        text: translated,
        side: details?.side || (implicit ? "implicit" : matched?.side || "existing"),
        tier: details?.tier || matched?.tier || 0,
        domain: matched?.domain || "",
        family: matched?.family || ""
      });
    };
    const flushPending = () => {
      if (pendingLines.length) append(pendingLines, pending);
      pendingLines = [];
      pending = null;
    };
    for (let i = start + 1; i < item.lines.length; i += 1) {
      const line = item.lines[i];
      if (header.test(line)) {
        flushPending();
        pending = {
          side: /Prefix Modifier/i.test(line) ? "prefix" : /Suffix Modifier/i.test(line) ? "suffix" : "existing",
          tier: Number.parseInt(line.match(/Tier:\s*(\d+)/i)?.[1] || "0", 10)
        };
        continue;
      }
      if (!line || separator.test(line) || skip.test(line) || metadata.test(line)) {
        flushPending();
        continue;
      }
      if (pending) {
        pendingLines.push(line);
        continue;
      }

      let composite = null;
      for (let size = 3; size >= 2; size -= 1) {
        const candidateLines = item.lines.slice(i, i + size);
        if (candidateLines.length !== size || candidateLines.some((candidate) =>
          !candidate || separator.test(candidate) || skip.test(candidate) || metadata.test(candidate) || header.test(candidate))) continue;
        if (matchExisting(candidateLines.map(cleanLine).join(""), index)) {
          composite = candidateLines;
          break;
        }
      }
      append(composite || [line]);
      if (composite) i += composite.length - 1;
    }
    flushPending();
    return results;
  }

  function itemClassZh(item) {
    return DATA.meta.classLabels[item.category]?.zh || item.itemClass;
  }

  function categoryZh(item) {
    const attrs = item.category.match(/_(str|dex|int)(_(dex|int))?$/)?.[0];
    const attrLabel = { _str: "力量", _dex: "敏捷", _int: "智慧", _str_dex: "力量／敏捷", _str_int: "力量／智慧", _dex_int: "敏捷／智慧" }[attrs] || "";
    return attrLabel ? `${itemClassZh(item)} · ${attrLabel}` : itemClassZh(item);
  }

  function eligibleTiers(group, itemLevel) {
    return group.tiers.filter((tier) => tier.ilvl <= itemLevel).sort((a, b) => a.tier - b.tier);
  }

  function poolWeight(groups, side, itemLevel) {
    return groups
      .filter((group) => group.side === side)
      .flatMap((group) => eligibleTiers(group, itemLevel))
      .reduce((sum, tier) => sum + tier.weight, 0);
  }

  function formatChance(weight, total, forced) {
    if (forced) return "必出";
    if (!weight || !total) return "—";
    const value = weight / total * 100;
    return `${value < 0.01 ? value.toFixed(3) : value.toFixed(2)}%`;
  }

  function renderGroup(domain, group, itemLevel, totalWeight) {
    const tiers = eligibleTiers(group, itemLevel);
    if (!tiers.length) return "";
    const forced = FORCED_DOMAINS.has(domain);
    const rows = tiers.map((tier) => `
      <tr>
        <td>${forced || group.side === "special" ? "—" : `T${tier.tier}`}</td>
        <td>${tier.ilvl}</td>
        <td>${escapeHtml(tier.text)}${tier.name ? `<div class="tier-source">來源：${escapeHtml(tier.name)}</div>` : ""}</td>
        <td class="weight">${forced && tier.weight === 0 ? "—" : tier.weight.toLocaleString()}</td>
        <td class="chance">${formatChance(tier.weight, totalWeight, forced)}</td>
      </tr>`).join("");
    const best = forced ? "指定詞綴" : group.side === "special" ? "特殊結果" : `最高 T${tiers[0].tier}`;
    const body = `<div class="table-wrap"><table class="tier-table">
          <thead><tr><th>Tier</th><th>需求 ilvl</th><th>數值與來源</th><th>Weight</th><th>機率</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`;
    if (tiers.length === 1) {
      return `<article class="mod-card single-tier ${group.side === "suffix" ? "suffix" : "prefix"}" data-family="${escapeHtml(group.family)}">
        <div class="single-heading"><span class="pattern">${escapeHtml(group.text)}</span><span class="best-tier">${best}</span></div>
        ${body}
      </article>`;
    }
    return `
      <details class="mod-card ${group.side === "suffix" ? "suffix" : "prefix"}" data-family="${escapeHtml(group.family)}">
        <summary><span class="pattern">${escapeHtml(group.text)}</span><span class="best-tier">${best}</span></summary>
        ${body}
      </details>`;
  }

  function renderSide(domain, groups, side, itemLevel, query = "") {
    const selected = groups.filter((group) => group.side === side && eligibleTiers(group, itemLevel).length && matchesSearch(group, itemLevel, query));
    const total = poolWeight(groups, side, itemLevel);
    return {
      count: selected.length,
      html: selected.map((group) => renderGroup(domain, group, itemLevel, total)).join("") || '<div class="empty">此 ilvl 沒有可用詞綴</div>'
    };
  }

  function matchesSearch(group, itemLevel, query) {
    if (!query) return true;
    const haystack = [group.text, group.family, ...eligibleTiers(group, itemLevel).flatMap((tier) => [tier.text, tier.textEn, tier.name])]
      .filter(Boolean).join(" ").toLowerCase();
    return query.split(/\s+/).every((word) => haystack.includes(word));
  }

  function renderDomain(domain, groups, itemLevel, query) {
    const prefix = renderSide(domain, groups, "prefix", itemLevel, query);
    const suffix = renderSide(domain, groups, "suffix", itemLevel, query);
    const special = renderSide(domain, groups, "special", itemLevel, query);
    const total = prefix.count + suffix.count + special.count;
    if (!total) return "";
    const label = DATA.meta.domainLabels[domain] || { title: domain, description: "特殊來源詞綴" };
    const content = special.count && !prefix.count && !suffix.count
      ? `<div class="special-grid">${special.html}</div>`
      : `<div class="columns">
          <section><div class="section-title"><h3>前綴</h3><span>${prefix.count}</span></div><div class="mod-list">${prefix.html}</div></section>
          <section><div class="section-title"><h3>後綴</h3><span>${suffix.count}</span></div><div class="mod-list">${suffix.html}</div></section>
        </div>${special.count ? `<div class="special-grid extra-special"><div class="section-title"><h3>特殊結果</h3><span>${special.count}</span></div>${special.html}</div>` : ""}`;
    return `<details class="domain-section" data-domain="${escapeHtml(domain)}"${domain === "normal" ? " open" : ""}>
      <summary class="domain-heading"><div><p class="domain-kicker">${escapeHtml(domain)}</p><h2>${escapeHtml(label.title)}</h2><p class="domain-description">${escapeHtml(label.description)}</p></div><span class="count">${total}</span></summary>
      <div class="domain-body">${content}</div>
    </details>`;
  }

  function renderExisting(modifiers) {
    $("existingCount").textContent = String(modifiers.length);
    $("existingMods").innerHTML = modifiers.map((modifier) => {
      const kind = modifier.side === "prefix" ? "前綴" : modifier.side === "suffix" ? "後綴" : modifier.side === "implicit" ? "固定／隱性" : "已有詞綴";
      const tier = (modifier.side === "prefix" || modifier.side === "suffix") && modifier.tier ? ` · T${modifier.tier}` : "";
      return `<div class="existing-mod"><span class="kind">${kind}${tier}</span><span class="existing-text">${escapeHtml(modifier.text)}</span></div>`;
    }).join("") || '<div class="empty">複製文字中沒有可辨識的現有詞綴</div>';
  }

  function analyze() {
    try {
      const item = parseItem(input.value);
      const domains = DATA.categories[item.category];
      const existing = extractExistingModifiers(item);
      const blockedFamilies = new Set(existing
        .filter((modifier) => (modifier.side === "prefix" || modifier.side === "suffix") && modifier.family)
        .flatMap((modifier) => modifier.family.split("/").filter(Boolean)));
      const query = ($("modSearch").value || "").trim().toLowerCase();
      const baseZh = DATA.meta.baseTranslations[item.baseType] || item.baseType || item.name || "—";
      $("baseType").textContent = baseZh;
      $("itemClass").textContent = itemClassZh(item);
      $("itemLevel").textContent = String(item.itemLevel);
      $("category").textContent = categoryZh(item);
      renderExisting(existing);
      let availableGroups = 0;
      const sections = [];
      for (const domain of DATA.meta.domainOrder) {
        const groups = (domains[domain] || []).filter((group) => !group.family.split("/").some((family) => blockedFamilies.has(family)));
        const eligible = groups.filter((group) => eligibleTiers(group, item.itemLevel).length).length;
        if (eligible) {
          availableGroups += eligible;
          sections.push(renderDomain(domain, groups, item.itemLevel, query));
        }
      }
      $("domainSections").innerHTML = sections.join("") || '<div class="empty search-empty">沒有符合搜尋條件的詞綴</div>';
      $("result").classList.remove("hidden");
      setStatus(`已載入 ${existing.length} 條物品現有詞綴、${availableGroups} 組可用詞綴；已排除現有詞綴系列並按 ilvl ${item.itemLevel} 重新計算機率。`, "ok");
    } catch (error) {
      $("result").classList.add("hidden");
      setStatus(error.message || String(error), "error");
    }
  }

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
  }

  $("analyze").addEventListener("click", analyze);
  $("modSearch").addEventListener("input", () => {
    if (input.value.trim()) analyze();
  });
  input.addEventListener("paste", () => setTimeout(analyze, 0));
  $("readClipboard").addEventListener("click", async () => {
    try {
      input.value = await navigator.clipboard.readText();
      analyze();
    } catch {
      input.focus();
      setStatus("瀏覽器未允許直接讀取剪貼簿；請在文字框內按 Ctrl+V。", "error");
    }
  });
  $("sample").addEventListener("click", () => {
    input.value = `Item Class: Sceptre\nRarity: Rare\nDoom Branch\nShrine Sceptre\n--------\nRequires: Level 65, 50 Str, 100 Int\n--------\nItem Level: 71\n--------\n+20% to Fire Resistance (implicit)\n--------\n+104 to maximum Mana\n+28 to Intelligence\n--------`;
    analyze();
  });
  $("clear").addEventListener("click", () => {
    input.value = "";
    $("result").classList.add("hidden");
    setStatus("等待貼上裝備文字");
    input.focus();
  });
})();
