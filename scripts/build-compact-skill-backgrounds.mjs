import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer } from "vite";
import { h } from "vue";
import { renderToString } from "@vue/server-renderer";

// Reuse the planner's native art composition so server-specific prerequisites,
// replacement skills and the Warlock trees stay aligned with the active data.
const output = resolve("public/images/planner/skills-compact");
const width = 360;
const height = 580;
const layer = { x: 10, y: 70, width: 340, height: (340 * 1046) / 740 };
const xml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]
  );
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const embedded = new Map();
async function image(path) {
  if (!embedded.has(path)) {
    const extension = path.split(".").at(-1);
    const mime = { jpg: "jpeg", png: "png", webp: "webp", avif: "avif" }[extension];
    assert(mime, `Unsupported image: ${path}`);
    embedded.set(
      path,
      `data:image/${mime};base64,${(await readFile(resolve("public", path))).toString("base64")}`
    );
  }
  return embedded.get(path);
}
async function standalone(markup) {
  const paths = [...new Set([...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))];
  for (const path of paths) {
    const local = path.slice(path.indexOf("images/"));
    assert(local.startsWith("images/"), `Unexpected artwork source: ${path}`);
    markup = markup.replaceAll(`href="${path}"`, `href="${await image(local)}"`);
  }
  return markup;
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { plannerClasses, plannerSkills, plannerSource } = await server.ssrLoadModule(
    "/src/shared/planner.ts"
  );
  const { wowheadTreeArtwork, wowheadSkillSprite } = await server.ssrLoadModule(
    "/src/utils/planner-skill-art.ts"
  );
  const { nativeSkillTreeArtwork } = await server.ssrLoadModule(
    "/src/utils/planner-native-skill-art.ts"
  );
  const { default: Branches } = await server.ssrLoadModule(
    "/src/components/planner/PlannerSkillBranches.vue"
  );
  const { default: NativeBranches } = await server.ssrLoadModule(
    "/src/components/planner/PlannerNativeSkillBranches.vue"
  );
  await mkdir(output, { recursive: true });
  const stone = await image("images/planner/skill-tree.jpg");
  const manifest = {
    version: 1,
    source: plannerSource,
    size: { width, height },
    pngSize: { width: width * 2, height: height * 2 },
    layer,
    header: { x: 5, y: 5, width: 350, height: 52 },
    classes: [],
  };
  let skillsTotal = 0;
  let edgesTotal = 0;
  for (const character of plannerClasses) {
    const order = character.id === "warlock" ? [0, 1, 2] : [2, 1, 0];
    const record = { id: character.id, name: character.name, trees: [] };
    for (const tree of order) {
      const skills = plannerSkills.filter(
        (s) => s.classId === character.id && s.tree === tree
      );
      assert(
        skills.length > 0 && skills.length <= 18,
        `${character.id}/${tree}: invalid skill count`
      );
      assert.equal(
        new Set(skills.map((s) => `${s.row}:${s.column}`)).size,
        skills.length
      );
      for (const skill of skills) {
        assert(
          skill.row >= 1 && skill.row <= 6 && skill.column >= 1 && skill.column <= 3
        );
        for (const id of skill.requires)
          assert(
            skills.some((s) => s.id === id),
            `Missing prerequisite ${id}`
          );
      }
      const art = wowheadTreeArtwork(character.id, tree);
      const native = art ? undefined : nativeSkillTreeArtwork(skills);
      assert(art || native, `No validated native artwork: ${character.id}/${tree}`);
      let branches =
        art && !art.adaptation
          ? `<svg viewBox="0 0 740 1046" preserveAspectRatio="none"><image href="${art.image}" width="740" height="1046"/></svg>`
          : await renderToString(
              h(art ? Branches : NativeBranches, { art: art || native })
            );
      branches = branches
        .replaceAll("viewbox=", "viewBox=")
        .replaceAll("preserveaspectratio=", "preserveAspectRatio=");
      branches = branches.replace(
        "<svg",
        `<svg x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}"`
      );
      branches = await standalone(branches);
      const icons = [];
      const nodes = [];
      for (const skill of skills) {
        const sprite = wowheadSkillSprite(skill);
        const path = sprite || skill.icon;
        const x = layer.x + (((skill.column - 1) * 260 + 10) / 740) * layer.width;
        const y = layer.y + (((skill.row - 1) * 180 + 10) / 1046) * layer.height;
        const size = (136 / 740) * layer.width;
        const glyph = await image(path);
        // Native sprites contain the idle/pressed states side by side. The first
        // state is a background placeholder; live ranks/titles remain separate.
        icons.push(
          `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1 1" overflow="hidden"><image href="${glyph}" width="${sprite ? 2 : 1}" height="1" preserveAspectRatio="none" filter="url(#idle)"/></svg>`
        );
        nodes.push({
          id: skill.id,
          name: skill.name,
          row: skill.row,
          column: skill.column,
          requires: skill.requires,
          icon: path,
          bounds: { x, y, width: size, height: size },
        });
      }
      const title = character.trees[tree];
      const stem = `${character.id}-${slug(title.en)}`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1160" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(`${character.name.en} — ${title.en}`)}">
<title>${xml(`${character.name.en} — ${title.en}`)}</title>
<defs>
<linearGradient id="header" x2="0" y2="1"><stop stop-color="#191a1b"/><stop offset="1" stop-color="#0d0e10"/></linearGradient>
<filter id="idle" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="0.58"/><feFuncG type="linear" slope="0.58"/><feFuncB type="linear" slope="0.58"/></feComponentTransfer></filter>
</defs>
<rect width="360" height="580" fill="#151617"/>
<svg x="4" y="4" width="352" height="572" viewBox="145 254 875 1100" preserveAspectRatio="xMidYMid slice"><image href="${stone}" width="1162" height="1507"/></svg>
<rect x="4.5" y="4.5" width="351" height="52" fill="url(#header)" stroke="#514e42"/>
<path d="M5 57H355" stroke="#090a0a" stroke-width="2"/>
${branches}
${icons.join("\n")}
<rect x="1" y="1" width="358" height="578" fill="none" stroke="#121312" stroke-width="2"/>
<rect x="3" y="3" width="354" height="574" fill="none" stroke="#706b56"/>
<path d="M4 576V4H356" fill="none" stroke="#8d8772" stroke-opacity=".35"/>
</svg>\n`;
      assert(!svg.includes('href="/'), `External image reference in ${stem}`);
      await writeFile(resolve(output, `${stem}.svg`), svg);
      record.trees.push({
        tree,
        title,
        svg: `${stem}.svg`,
        png: `${stem}.png`,
        art: art || { composition: "native-parts" },
        skills: nodes,
      });
      skillsTotal += skills.length;
      edgesTotal += skills.reduce((n, s) => n + s.requires.length, 0);
    }
    manifest.classes.push(record);
  }
  assert.equal(manifest.classes.length, 8);
  assert.equal(skillsTotal, 240);
  await writeFile(
    resolve(output, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  const preview = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Компактные деревья навыков — Blizzless</title>
<style>
@font-face{font-family:Diablo;src:url(../../../fonts/DiabloFont.ttf)}*{box-sizing:border-box}body{margin:0;background:#090a0b;color:#eee;font-family:Arial,sans-serif}main{padding:24px;max-width:1190px;margin:auto}h1{font-size:22px;margin:0 0 8px}p{color:#a9abae;font-size:14px}.class-title{margin:24px 0 12px;font-size:20px}.trees{display:flex;gap:4px;width:max-content}.tree{position:relative;width:360px;height:580px}.tree img{display:block;width:100%;height:100%}.heading{position:absolute;left:10px;top:13px;width:340px;text-align:center;font-family:Diablo,Georgia,serif;font-size:17px;letter-spacing:.7px;line-height:1.25;color:#e0dfdb;text-shadow:0 2px 2px #000}.heading small{display:block;font-size:14px;margin-top:3px}.downloads{margin:10px 0 22px;display:flex;gap:18px}a{color:#cab77b;font-size:13px}.export main{padding:0;margin:0;max-width:none}.export .tree{width:720px;height:1160px}.export .heading{display:none}.export.single .trees{gap:0}.export.preview .heading{display:block}.export .class-title{display:none}
</style><main id="gallery"><h1>Компактные деревья навыков</h1><p>8 классов · 24 ветки · оригинальные иконки и связи Blizzless. Плашки заголовков пустые: текст и очки выводятся интерфейсом.</p></main>
<script>
const classes=${JSON.stringify(manifest.classes.map(({ id, name, trees }) => ({ id, name, trees: trees.map(({ title, svg, png }) => ({ title, svg, png })) })))};
const q=new URLSearchParams(location.search), selected=q.get('class'), tree=q.get('tree'), exporting=q.has('export');
const gallery=document.getElementById('gallery');
if(exporting){document.body.className='export '+(tree!==null?'single':'preview');gallery.replaceChildren()}
for(const c of classes){if(selected&&c.id!==selected)continue;const section=document.createElement('section');section.dataset.class=c.id;section.innerHTML='<h2 class="class-title">'+c.name.ru+' · '+c.name.en+'</h2><div class="trees"></div>';const row=section.querySelector('.trees');c.trees.forEach((t,i)=>{if(tree!==null&&Number(tree)!==i)return;const panel=document.createElement('div');panel.className='tree';panel.dataset.file=t.png;panel.innerHTML='<img src="'+t.svg+'" alt="'+t.title.en+'">';row.append(panel)});gallery.append(section);if(!exporting){const links=document.createElement('div');links.className='downloads';for(const t of c.trees){const a=document.createElement('a');a.href=t.svg;a.download=t.svg;a.textContent=t.title.en+' · SVG';links.append(a)}section.append(links)}}
</script></html>`;
  await writeFile(resolve(output, "preview.html"), preview);
  console.log(
    `Saved 24 compact native backgrounds for 8 classes: ${skillsTotal} skills, ${edgesTotal} prerequisite links.`
  );
  console.log(output);
} finally {
  await server.close();
}
