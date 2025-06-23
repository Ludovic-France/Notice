/* ----------- Données et variables globales ----------- */
let selectedPage = 0;
let pages = []; // Contient les pages de la notice
let selectedElement = null; // Élément sélectionné
let orientation = []; // Pour chaque page
const INDEX_REV = "ENR-063-04"; // Valeur fixe par défaut
const NUM_REF = "900000"; // Modifiable uniquement page 1
const COLOR_DROP = "#eee";
let isResizingCol = false;

// Pour les chapitres (chapterTitle)
let chapterCounter = 0;

// Pour les titres H1→H4
const hCounters = [0, 0, 0, 0];  // [H1, H2, H3, H4]

// ---- Initialisation principale au chargement ----
window.onload = () => {
    initIcons();
    initDocument();
    setupDragNDrop();
};


/**
 * Calcule le numéro de chapitre (chapterTitle) pour la page pageIndex
 * en comptant toutes les occurences de chapterTitle dans pages[2..pageIndex]
 * et renvoie ce compteur (1-based).
 */
function chapterCounterForTOC(pages, pageIndex) {
  let count = 0;
  for (let i = 2; i <= pageIndex && i < pages.length; i++) {
    const p = pages[i];
    if (!Array.isArray(p.objects)) continue;
    for (const obj of p.objects) {
      if (obj.type === "chapterTitle") {
        count++;
        // si c'est dans la page cible, on a notre numéro
        if (i === pageIndex) return count;
      }
    }
  }
  return count;
}

/**
 * Calcule le tableau [h1,h2,h3,h4] pour la page pageIndex / un titre Hn
 * en simulant le même incrément/réinit que dans le renderPage.
 */
function headingCountersForTOC(pages, pageIndex, targetObj) {
  const counters = [0, 0, 0, 0];
  outer:
  for (let i = 2; i <= pageIndex && i < pages.length; i++) {
    const p = pages[i];
    if (!Array.isArray(p.objects)) continue;
    for (const obj of p.objects) {
      if (!/^h[1-4]$/.test(obj.type)) continue;
      const lvl = parseInt(obj.type[1], 10) - 1;
      // incrémente et reset des niveaux inférieurs
      counters[lvl]++;
      for (let k = lvl+1; k < 4; k++) counters[k] = 0;
      // si c'est l'objet qu'on veut numéroter (même référence)
      if (i === pageIndex && obj === targetObj) {
        break outer;
      }
    }
  }
  return counters;
}

// ----- Initialisation de la collection de pictogrammes -----
function initIcons() {
    const iconList = document.getElementById('icons-list');
    iconList.innerHTML = "";
    if (typeof IconData !== "undefined") {
        IconData.forEach((icon, idx) => {
            let img = document.createElement('img');
            img.src = icon.url;
            img.title = icon.title;
            img.draggable = true;
            img.classList.add("icon-picto");
            img.setAttribute('data-icon', idx);
            // Drag
            img.addEventListener('dragstart', evt => {
                evt.dataTransfer.setData("type", "icon");
                evt.dataTransfer.setData("icon", idx);
            });
            iconList.appendChild(img);
        });
    }
}

// ------ Création initiale du document ------
function initDocument() {
    // Construction initiale selon chapitre-data.js
    pages = [];
    orientation = [];
    // 1ère page : Couverture
    pages.push({
        type: 'cover',
        title: "Notice : Machine d'assemblage",
        docTitle: "Titre du document",
        img: null,
        editableNum: NUM_REF
    });
    orientation.push("portrait");
    // 2ème page : Sommaire
    pages.push({
        type: 'toc'
    });
    orientation.push("portrait");
    // Pages par chapitre
    if (typeof ChapitreData !== "undefined") {
        ChapitreData.forEach(chap => {
			pages.push({
				type: 'chapter',
				chapterTitle: chap.titre,
				objects: [{ type: "chapterTitle", text: chap.titre }]
			});
			/*pages.push({
                type: 'chapter',
                chapterId: chap.id,
                chapterTitle: chap.titre,
                objects: []
            });*/
            orientation.push("portrait");
        });
    }
    renderDocument();
}

/* --------- Affichage du document complet ---------- */
function renderDocument() {
    const container = document.getElementById('pages-container');
    container.innerHTML = '';
    pages.forEach((page, idx) => {
        let div = renderPage(page, idx); // récupère le conteneur
        div.onclick = (e) => {
            selectedPage = idx;
            //renderDocument();
			updateSelectionClass();
            e.stopPropagation(); // évite sélection multiple
        };
        if (idx === selectedPage) div.classList.add("selected");
        container.appendChild(div);
    });
	updateSelectionClass();
}

/* --------- Affichage d'une page ---------- */
function renderPage(page, idx) {
    // Conteneur principal de la page
    let div = document.createElement('div');
    div.className = "page";
    if (orientation[idx] === "landscape") div.classList.add("landscape");

    // ---- En-tête ----
    let header = document.createElement('div');
    header.className = "header";

    // Logo à gauche
    let logo = document.createElement('img');
    logo.className = "logo";
    logo.src = (typeof logoData !== "undefined" ? logoData.url : "");
    header.appendChild(logo);

    // Titre du document (éditable uniquement sur la première page)
    let docTitle = document.createElement('div');
    docTitle.className = "doc-title";
    if (idx === 0) {
        docTitle.contentEditable = "true";
        docTitle.spellcheck = false;
        docTitle.innerText = page.docTitle || "Titre du document";
        docTitle.addEventListener('blur', function() {
            pages[0].docTitle = docTitle.innerText;
        });
    } else {
        docTitle.innerText = pages[0].docTitle || "Titre du document";
    }
    header.appendChild(docTitle);

    // Indice de révision et numéro d'affaire (numéro modifiable seulement sur la première page)
    let revBox = document.createElement('div');
    revBox.className = "revision";
    revBox.innerHTML = `
        <div class="index">${INDEX_REV}</div>
        <div class="num" contenteditable="${idx === 0 ? 'true' : 'false'}" spellcheck="false">${pages[0].editableNum || "900000"}</div>
    `;
    if (idx === 0) {
        let numDiv = revBox.querySelector('.num');
        numDiv.addEventListener('blur', function() {
            pages[0].editableNum = numDiv.innerText;
        });
    }
    header.appendChild(revBox);

    div.appendChild(header);

    // ---- Contenu principal de la page ----
    let content = document.createElement('div');
    content.className = "content";

    // ---- Page de garde (0) ----
    if (idx === 0) {
        // Titre principal (éditable)
        let title = document.createElement('div');
        title.contentEditable = "true";
        title.style.fontSize = "30pt";
        title.className = "doc-title";
        title.innerText = page.title || "Notice : Untel";
        title.addEventListener('blur', function() {
            page.title = title.innerText;
        });

        // Sélection à clic
        title.onclick = function(e) {
            selectedElement = { pageIdx: idx, objIdx: "mainTitle", type: "mainTitle" };
            document.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
            title.classList.add('selected');
            e.stopPropagation();
        };
        if (selectedElement && selectedElement.pageIdx === idx && selectedElement.objIdx === "mainTitle")
            title.classList.add('selected');

        content.appendChild(title);

        // Image de couverture
        let imgDrop = document.createElement('div');
        imgDrop.className = "img-drop";
        imgDrop.innerHTML = page.img ? `<img src="${page.img}" alt="image">` : '<span>Glissez une image ici</span>';
        imgDrop.ondragover = e => { e.preventDefault(); imgDrop.style.background="#eef"; };
        imgDrop.ondragleave = e => { imgDrop.style.background=""; };
        imgDrop.ondrop = e => {
            e.preventDefault();
            imgDrop.style.background="";
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image')) {
                let reader = new FileReader();
                reader.onload = evt => {
                    page.img = evt.target.result;
                    renderDocument();
                };
                reader.readAsDataURL(file);
            }
        };
		//copier-coller d'image

		imgDrop.addEventListener('paste', e => {
		e.preventDefault();
		const items = e.clipboardData.items;
		for (let item of items) {
		if (item.kind === 'file' && item.type.startsWith('image/')) {
		  const file = item.getAsFile();
		  const reader = new FileReader();
		  reader.onload = () => {
			imgDrop.innerHTML = '';         // ou tu peux appendChild()
			const img = document.createElement('img');
			img.src = reader.result;
			img.style.maxWidth  = '100%';
			img.style.maxHeight = '100%';
			imgDrop.appendChild(img);
		  };
		  reader.readAsDataURL(file);
		  return;
		}
		}
		// Si on colle un URL d’image
		const url = e.clipboardData.getData('text/uri-list') || e.clipboardData.getData('text/plain');
		if (url && /^https?:\/\//.test(url)) {
		fetch(url)
		  .then(r => r.blob())
		  .then(blob => {
			const reader = new FileReader();
			reader.onload = () => {
			  imgDrop.innerHTML = '';
			  const img = document.createElement('img');
			  img.src = reader.result;
			  img.style.maxWidth  = '100%';
			  img.style.maxHeight = '100%';
			  imgDrop.appendChild(img);
			};
			reader.readAsDataURL(blob);
		  })
		  .catch(console.error);
		}
		});
        content.appendChild(imgDrop);
    }

    // ---- Sommaire dynamique (page 1) ----
	else if (idx === 1) {
	  // si on n’a pas déjà un <ol id="table-of-contents">, on le crée
	  let toc = document.getElementById("table-of-contents");
	  if (!toc) {
		toc = document.createElement("ol");
		toc.id = "table-of-contents";
		toc.style.fontSize = "1.3em";
		toc.style.margin   = "0 0 0 24px";
		toc.style.padding  = "0";
		content.appendChild(toc);
	  }
	  // on vide le sommaire précédent
	  toc.innerHTML = "";

	  // on parcourt de la page 2 à la fin
	  for (let i = 2; i < pages.length; i++) {
		let p = pages[i];
		if (Array.isArray(p.objects)) {
		  p.objects.forEach(obj => {
			if ((/^h[1-4]$/.test(obj.type) || obj.type === "chapterTitle")
				&& obj.text) {
			  let li = document.createElement("li");
			  // On reprend exactement le texte affiché (numérotation + obj.text)
			  // Pour ça, on simule le même prefix qu’au rendu page :
			  let prefix = "";
			  if (obj.type === "chapterTitle") {
				prefix = chapterCounterForTOC(pages, i) + ". ";
			  } else {
				const level = parseInt(obj.type[1]) - 1;
				const counters = headingCountersForTOC(pages, i);
				prefix = counters.slice(0, level + 1).join(".") + ". ";
			  }
			  li.innerText = prefix + obj.text;
			  // indentation selon H2–H4
			  if (obj.type !== "chapterTitle") {
				li.style.marginLeft = `${(parseInt(obj.type[1]) - 1) * 24}px`;
			  }
			  toc.appendChild(li);
			}
		  });
		}
	  }
	}
    // ---- Toutes les autres pages (avec objets : titres, textes, etc.) ----
    else {
		// Assure que page.objects existe
		if (!Array.isArray(page.objects)) page.objects = [];

		let objs = document.createElement('div');
		objs.className = "chapter-objects";
		/*objs.style.minHeight = "2cm";
		objs.style.maxHeight = "25cm";*/ //Gérer dans le css

		// --- Drop zone AVANT tout objet (pour insérer tout en haut si page non vide) ---
		let dropStart = document.createElement('div');
		dropStart.className = "drop-target";
		//dropStart.style.height = "4px";
		//dropStart.style.margin = "2px 0";
		//dropStart.style.background = "transparent";
		dropStart.addEventListener('dragover', e => {
			e.preventDefault();
			dropStart.style.background = "#cce2ff";
		});
		dropStart.addEventListener('dragleave', e => {
			dropStart.style.background = COLOR_DROP;
		});
		dropStart.addEventListener('drop', e => {
			e.preventDefault();
			dropStart.style.background = COLOR_DROP;
			const type = e.dataTransfer.getData("type");
			if (!type) return;
			let newObj = null;
			if (["h1", "h2", "h3", "h4"].includes(type))
				newObj = { type: type, text: type.toUpperCase() };
			else if (type === "text")
				newObj = { type: "text", html: "Zone de texte" };
			else if (type === "table")
				newObj = { type: "table", rows: [["", ""], ["", ""]] };
			if (!newObj) return;
			page.objects.unshift(newObj); // Ajoute en tout début
			renderDocument();
		});
		objs.appendChild(dropStart);
		const hdrCounters = [0, 0, 0, 0, 0];
		// --- Boucle sur chaque objet pour générer le rendu et la drop-zone suivante ---
		page.objects.forEach((obj, oid) => {
			let el = null;
			// Titres
		// … quelque part dans renderPage, pour chaque obj :
		if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
		  let prefix = "";

		  if (obj.type === "chapterTitle") {
			// Chapitre principal
			chapterCounter++;
			hCounters.fill(0);                     // on remet à zéro tous les H1–H4
			prefix = `${chapterCounter}. `;
		  } else {
			// Un titre Hn
			const level = parseInt(obj.type[1]) - 1;  // H1→0, H2→1…
			// incrémentation / reset des sous-niveaux
			hCounters[level]++;
			for (let k = level + 1; k < 4; k++) hCounters[k] = 0;
			// construction de la chaîne, p.ex. "2.3.1. "
			prefix = hCounters
			  .slice(0, level + 1)
			  .join(".") + ". ";
		  }

		  // création de l’élément
		  el = document.createElement("div");
		  el.contentEditable = "true";
		  el.className = "chapter-title" + (obj.type !== "chapterTitle" ? " " + obj.type : "");
		  // on affiche la numérotation + le texte brut
		  el.innerText = prefix + obj.text;

		  // au blur on met simplement à jour obj.text *sans* le préfixe
		  el.addEventListener("blur", () => {
			obj.text = el.innerText.replace(/^(\d+\.)+\s*/, "");
		  });
		}

			// Zones de texte
			else if (obj.type === "text") {
				el = document.createElement('div');
				el.contentEditable = "true";
				el.className = "rte-area";
				el.innerHTML = obj.html || "";
				el.addEventListener('blur', function() { obj.html = el.innerHTML; });
			}
else if (obj.type === "table") {
  // option header (shading + bold)
  if (obj.headerShaded === undefined) obj.headerShaded = false;

  el = document.createElement('div');
  el.className = "table-container";

  // ─── TABLE & COLGROUP ─────────────────────────────────────────
  let table = document.createElement('table');
  table.className = "page-table";
  table.style.width = "100%";
  table.style.tableLayout = "fixed";

  let firstRow = obj.rows.find(r => r && r.length);
  let nbCols = firstRow ? firstRow.length : 2;

  // init largeurs
  if (!obj.colWidths || obj.colWidths.length !== nbCols) {
    obj.colWidths = Array(nbCols).fill((100/nbCols) + "%");
  }

  let colgroup = document.createElement('colgroup');
  for (let c = 0; c < nbCols; c++) {
    let col = document.createElement('col');
    col.style.width = obj.colWidths[c];
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);

  // ─── TBODY ────────────────────────────────────────────────────
  let tbody = document.createElement('tbody');
  obj.rows.forEach((row, i) => {
    let tr = document.createElement('tr');

    // header shading
    if (i === 0 && obj.headerShaded) {
      tr.style.backgroundColor = "#f5f5f5";
      tr.style.fontWeight       = "bold";
    }

    for (let j = 0; j < (row ? row.length : 0); j++) {
      let cellData = row[j];
      if (cellData === null) continue; // fusion partielle

      let td = document.createElement('td');
      td.contentEditable = "true";
      td.style.verticalAlign = "middle";
      td.style.overflow = "hidden";
      td.style.position = "relative";

      // focus à gauche
      td.addEventListener('focus', () => {
        const range = document.createRange();
        range.selectNodeContents(td);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      // ── contenu texte ou image ────────────────────────────────
      if (typeof cellData === "object" && cellData.image) {
        let img = document.createElement('img');
        img.src = cellData.image;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        td.appendChild(img);
      } else {
        let text    = typeof cellData === "object" ? cellData.text    : cellData;
        td.innerText = text;
      }

      // colspan & align
      let colspan = (typeof cellData === "object" && cellData.colspan) ? cellData.colspan : 1;
      let align   = (typeof cellData === "object" && cellData.align)   ? cellData.align   : "left";
      td.colSpan = colspan;
      td.style.textAlign = align;

      // blur → mise à jour texte si pas d’image
      td.addEventListener('blur', () => {
        if (typeof cellData === "object") {
          if (!cellData.image) cellData.text = td.innerText;
        } else {
          obj.rows[i][j] = td.innerText;
        }
      });

      // ── collage d’image ────────────────────────────────────────
      td.addEventListener('paste', e => {
        e.preventDefault();
        for (let it of e.clipboardData.items) {
          if (it.kind === "file" && it.type.startsWith("image/")) {
            let file = it.getAsFile();
            let reader = new FileReader();
            reader.onload = () => {
              td.innerHTML = "";
              let img = document.createElement('img');
              img.src = reader.result;
              img.style.width = "100%";
              img.style.height = "100%";
              img.style.objectFit = "contain";
              td.appendChild(img);
              if (typeof cellData === "object") cellData.image = reader.result;
              else obj.rows[i][j] = { image: reader.result };
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      });

      // ── drag & drop d’image ───────────────────────────────────
      td.addEventListener('dragover', e => e.preventDefault());
      td.addEventListener('drop', e => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
          let file = e.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            let reader = new FileReader();
            reader.onload = () => {
              td.innerHTML = "";
              let img = document.createElement('img');
              img.src = reader.result;
              img.style.width = "100%";
              img.style.height = "100%";
              img.style.objectFit = "contain";
              td.appendChild(img);
              if (typeof cellData === "object") cellData.image = reader.result;
              else obj.rows[i][j] = { image: reader.result };
            };
            reader.readAsDataURL(file);
          }
        } else {
          let url = e.dataTransfer.getData('text/uri-list') 
                 || e.dataTransfer.getData('text/plain');
          if (url.startsWith("http")) {
            fetch(url).then(r=>r.blob()).then(blob=>{
              let reader = new FileReader();
              reader.onload = () => {
                td.innerHTML = "";
                let img = document.createElement('img');
                img.src = reader.result;
                img.style.width = "100%";
                img.style.height = "100%";
                img.style.objectFit = "contain";
                td.appendChild(img);
                if (typeof cellData === "object") cellData.image = reader.result;
                else obj.rows[i][j] = { image: reader.result };
              };
              reader.readAsDataURL(blob);
            });
          }
        }
      });

      // ── menu contextuel + remise du focus ─────────────────────
      td.addEventListener('contextmenu', e => {
        e.preventDefault();
        showTableMenu(e, obj, i, j);
        setTimeout(() => td.focus(), 0);
      });

      // ── resizer “Excel like” 1ʳᵉ ligne ───────────────────────
      if (i === 0 && j < nbCols - 1) {
        let resizer = document.createElement('div');
        resizer.className = "col-resizer";
        Object.assign(resizer.style, {
          position: "absolute", top: "0", right: "0",
          width: "6px", height: "100%", cursor: "col-resize", zIndex: "10"
        });
        td.appendChild(resizer);

        resizer.addEventListener('mousedown', e => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.pageX;
          const leftC  = colgroup.children[j];
          const rightC = colgroup.children[j+1];
          const wL = leftC.getBoundingClientRect().width;
          const wR = rightC.getBoundingClientRect().width;
          document.body.style.cursor = "col-resize";

          function onMove(ev) {
            let d = ev.pageX - startX;
            let nl = wL + d, nr = wR - d;
            if (nl < 40 || nr < 40) return;
            let tot = nl + nr;
            obj.colWidths[j]   = (nl / tot * 100) + "%";
            obj.colWidths[j+1] = (nr / tot * 100) + "%";
            leftC.style.width  = obj.colWidths[j];
            rightC.style.width = obj.colWidths[j+1];
          }
          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup',   onUp);
            document.body.style.cursor = "";
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup',   onUp);
        });
      }

      tr.appendChild(td);

      // ── appliquer la fusion (masque les suivants) ─────────────
      if (colspan > 1) {
        for (let k = 1; k < colspan; k++) obj.rows[i][j + k] = null;
        j += colspan - 1;
      }
    } // fin colonne

    tbody.appendChild(tr);
  }); // fin ligne

  table.appendChild(tbody);
  el.appendChild(table);
}


function applyHeadingNumbering() {
	// Pour chaque page, on récupère son numéro de chapitre
	const chapIdx = ChapitreData.findIndex(c => c.id === pageId);
	const baseNum = chapIdx + 1;    // 1,2,3…

	// On garde un compteur par niveau
	const counters = [ baseNum, 0, 0, 0 ]; // [chap, h1, h2, h3]

	// Pour tous les headings h1→h4 dans l’ordre d’apparition :
	document.querySelectorAll('h1,h2,h3,h4').forEach(el => {
		const lvl = parseInt(el.tagName[1],10); // 1 à 4
		// on incrémente le compteur de ce niveau
		counters[lvl] += 1;
		// on remet à zéro tous les niveaux inférieurs
		for(let i=lvl+1;i<counters.length;i++) counters[i]=0;
		// on construit la chaîne de numérotation : 1.2.3 pour lvl=3
		const numPrefix = counters.slice(0,lvl+1).join('.');
		// injecte dans le DOM
		el.innerText = `${numPrefix}  ${el.innerText}`;
	});
}

function buildPageTOC() {
	applyHeadingNumbering();    // on renumérote
	const toc = document.getElementById('page-toc');
	toc.innerHTML = '';
	document.querySelectorAll('h1,h2,h3,h4').forEach(el => {
		const lvl = parseInt(el.tagName[1],10);
		const a = document.createElement('a');
		a.href = `#${el.id}`;
		a.innerText = el.innerText;  // contient déjà le numéro
		a.style.paddingLeft = (lvl-1)*16 + 'px';
		toc.appendChild(a);
	});
}
			// ... ajouter gestion d'autres types ici si besoin ...

			// Sélection à clic
			if (el) {
				el.setAttribute("draggable", "true");
				el.addEventListener('dragstart', function(e) {
					e.dataTransfer.effectAllowed = "move";
					e.dataTransfer.setData('move-obj-oid', oid + ""); // Toujours envoyer en string !
					e.dataTransfer.setData('move-obj-page', idx + "");
					el.classList.add('dragging');
				});
				el.addEventListener('dragend', function(e) {
					el.classList.remove('dragging');
				});
				
				el.onclick = function(e) {
					selectedElement = { pageIdx: idx, objIdx: oid, type: obj.type };
					document.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
					el.classList.add('selected');
					e.stopPropagation();
				};
				if (selectedElement && selectedElement.pageIdx === idx && selectedElement.objIdx === oid)
					el.classList.add('selected');
				objs.appendChild(el);
			}

			// --- Drop zone APRÈS cet objet (pour insérer entre deux objets) ---
			let dropBetween = document.createElement('div');
			dropBetween.className = "drop-target";
			dropBetween.style.height = "8px";
			dropBetween.style.margin = "2px 0";
			dropBetween.style.background = COLOR_DROP;
			dropBetween.addEventListener('dragover', e => {
				e.preventDefault();
				dropBetween.style.background = "#cce2ff";
			});
			dropBetween.addEventListener('dragleave', e => {
				dropBetween.style.background = COLOR_DROP;
			});
			dropBetween.addEventListener('drop', e => {
				e.preventDefault();
				dropBetween.style.background = COLOR_DROP;
				const moveOid = e.dataTransfer.getData('move-obj-oid');
				const movePage = e.dataTransfer.getData('move-obj-page');
				const type = e.dataTransfer.getData("type");
				if (type) {
					// Cas du drag depuis la barre outils (insertion normale)
					let newObj = null;
					if (["h1", "h2", "h3", "h4"].includes(type))
						newObj = { type: type, text: type.toUpperCase() };
					else if (type === "text")
						newObj = { type: "text", html: "Zone de texte" };
					else if (type === "table")
						newObj = { type: "table", rows: [["", ""], ["", ""]] };
					if (!newObj) return;
					if (newObj) {
						page.objects.splice(oid + 1, 0, newObj);
						renderDocument();
						return;
					}
				}
				// Cas déplacement d'objet existant
				if (moveOid !== "" && movePage !== "") {
					const srcPageIdx = parseInt(movePage);
					const srcOid = parseInt(moveOid);

					if (srcPageIdx === idx) {
						// Même page : déplace l’objet
						if (srcOid !== oid && srcOid !== oid + 1) {
							const [objMoved] = page.objects.splice(srcOid, 1);
							let destOid = oid;
							if (srcOid < oid) destOid = oid;
							else destOid = oid + 1;
							page.objects.splice(destOid, 0, objMoved);
							renderDocument();
						}
					}
				}
			});
			objs.appendChild(dropBetween);
		});

		// --- Ajoute la zone de drop à la fin (pour ajout en bas) ---
		/*let dropEnd = document.createElement('div');
		dropEnd.className = "drop-target";
		//dropEnd.style.height = "8px";
		//dropEnd.style.margin = "2px 0";
		dropEnd.style.background = COLOR_DROP;
		dropEnd.addEventListener('dragover', e => {
			e.preventDefault();
			dropEnd.style.background = "#cce2ff";
		});
		dropEnd.addEventListener('dragleave', e => {
			dropEnd.style.background = COLOR_DROP;
		});
		dropEnd.addEventListener('drop', e => {
			e.preventDefault();
			dropEnd.style.background = COLOR_DROP;
			const type = e.dataTransfer.getData("type");
			if (!type) return;
			let newObj = null;
			if (["h1", "h2", "h3", "h4"].includes(type))
				newObj = { type: type, text: type.toUpperCase() };
			if (type === "text")
				newObj = { type: "text", html: "Zone de texte" };
			if (!newObj) return;
			page.objects.push(newObj); // Ajoute en bas
			renderDocument();
		});
		objs.appendChild(dropEnd);*/

		// Enfin, ajoute le tout au content principal de la page
		content.appendChild(objs);

    }

    // Pagination en bas de page
    let pagin = document.createElement('div');
    pagin.className = "pagination";
    pagin.innerText = `Page ${idx+1} / ${pages.length}`;
    div.appendChild(content);
    div.appendChild(pagin);

    // Sélection de page à clic sans renderDocument
    div.addEventListener('click', function(e) {
        selectedPage = idx;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('selected'));
        div.classList.add('selected');
    });
    if (idx === selectedPage) div.classList.add('selected');

    return div;
}

function showTableMenu(e, obj, rowIdx, colIdx) {
    let cellData = obj.rows[rowIdx][colIdx];
    if (cellData === null) return;

    // Supprime l’ancien menu
    let oldMenu = document.getElementById('table-menu-popup');
    if (oldMenu) oldMenu.remove();

    // Crée le nouveau menu
    let menu = document.createElement('div');
    menu.id = "table-menu-popup";
    Object.assign(menu.style, {
        position: "fixed",
        top: e.clientY + "px",
        left: e.clientX + "px",
        background: "#fff",
        border: "1px solid #999",
        borderRadius: "8px",
        zIndex: 10000,
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        fontSize: "1em",
        padding: "4px 0"
    });

    // helper pour focus+caret
    function restoreCaret() {
        // retrouve le <td> correspondant dans le DOM
        const table = menu._originTable;
        const td = table.rows[rowIdx].cells[colIdx];
        td.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(td);
        range.collapse(false);
        sel.addRange(range);
    }

    // <-- On stocke dans le menu une référence au tableau -->
    menu._originTable = e.currentTarget.closest('.table-container').querySelector('table');

    // Ajoute un item sans renderDocument (pour alignements)
    function alignItem(label, align) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, { padding:"6px 18px", cursor:"pointer" });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            // met à jour le modèle
            let c = obj.rows[rowIdx][colIdx];
            if (typeof c === "object") c.align = align;
            else obj.rows[rowIdx][colIdx] = { text: c, align };

            // applique DIRECTEMENT sur le <td>
            const td = menu._originTable.rows[rowIdx].cells[colIdx];
            td.style.textAlign = align;

            // restore focus + caret
            restoreCaret();

            // ferme le menu
            menu.remove();
        };
        menu.appendChild(item);
    }

    // Aligner à gauche
    alignItem("Aligner à gauche", "left");
    // Centrer
    alignItem("Centrer horizontalement", "center");

    // ---- Les items suivants ont besoin de re-render pour refaire le DOM du tableau ----
    function structuralItem(label, fn) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, { padding:"6px 18px", cursor:"pointer" });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            fn();
            menu.remove();
            renderDocument();
        };
        return item;
    }

  // ——— helper menuItem ———
	function menuItem(label, fn) {
		let item = document.createElement('div');
		item.innerText = label;
		item.style.padding = "6px 18px";
		item.style.cursor  = "pointer";
		item.onmouseover  = () => item.style.background = "#eef";
		item.onmouseleave = () => item.style.background = "#fff";
		item.onclick = () => {
		  fn();
		  menu.remove();
		  renderDocument();
		};
		return item;
	}

	// Toggle header shading
	menu.appendChild(menuItem(obj.headerShaded ? "Désactiver gris de la 1ʳᵉ ligne" : "Griser la 1ʳᵉ ligne", () => {
		obj.headerShaded = !obj.headerShaded;
	  }));
	menu.appendChild(document.createElement('hr'));
    // Ajouter colonne à droite
    menu.appendChild(structuralItem("Ajouter colonne à droite", () => {
        obj.rows.forEach(row => row.splice(colIdx + 1, 0, ""));
        const w = obj.colWidths[colIdx];
        obj.colWidths.splice(colIdx + 1, 0, w);
    }));

    // Ajouter ligne dessous
    menu.appendChild(structuralItem("Ajouter ligne dessous", () => {
        let newRow = obj.rows[0].map(() => "");
        obj.rows.splice(rowIdx + 1, 0, newRow);
    }));

    // Supprimer colonne
    if (obj.rows[0].length > 1) {
        menu.appendChild(structuralItem("Supprimer colonne", () => {
            for (let r = 0; r < obj.rows.length; r++) {
                let cd = obj.rows[r][colIdx];
                // fusion à gauche
                if (cd === null) {
                    for (let k = colIdx - 1; k >= 0; k--) {
                        let lc = obj.rows[r][k];
                        if (typeof lc === "object" && lc.colspan > 1) {
                            lc.colspan--;
                            obj.rows[r][colIdx] = "";
                            break;
                        }
                    }
                }
                // début fusion
                else if (typeof cd === "object" && cd.colspan > 1) {
                    let text = cd.text || "";
                    obj.rows[r][colIdx] = text;
                    for (let k = 1; k < cd.colspan; k++) {
                        if (obj.rows[r][colIdx + k] !== undefined) obj.rows[r][colIdx + k] = "";
                    }
                }
            }
            obj.rows.forEach(row => row.splice(colIdx, 1));
        }));
    }

    // Supprimer ligne
    if (obj.rows.length > 1) {
        menu.appendChild(structuralItem("Supprimer ligne", () => {
            obj.rows.splice(rowIdx, 1);
        }));
    }

    // Fusionner à droite
    if (colIdx < obj.rows[rowIdx].length - 1) {
        menu.appendChild(structuralItem("Fusionner à droite", () => {
            let cur = obj.rows[rowIdx][colIdx];
            let next = obj.rows[rowIdx][colIdx + 1];
            if (typeof cur === "object") {
                cur.colspan = (cur.colspan || 1) + (next && next.colspan ? next.colspan : 1);
                cur.text += " " + (typeof next === "object" ? next.text : next);
            } else {
                obj.rows[rowIdx][colIdx] = {
                    text: cur + " " + (typeof next === "object" ? next.text : next),
                    colspan: 2
                };
            }
            obj.rows[rowIdx].splice(colIdx + 1, 1);
        }));
    }

    // Scinder cellule
    if (typeof cellData === "object" && cellData.colspan > 1) {
        menu.appendChild(structuralItem("Scinder cellule", () => {
            let n = cellData.colspan;
            obj.rows[rowIdx][colIdx] = cellData.text || "";
            for (let i = 1; i < n; i++) obj.rows[rowIdx].splice(colIdx + 1, 0, "");
        }));
    }

    document.body.appendChild(menu);
    // ferme si clic à l’extérieur
    document.addEventListener('mousedown', function hideMenu(ev) {
        if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('mousedown', hideMenu);
        }
    });
}



function paginateObjects(idx) {
    // Pas de pagination sur la couverture ou sommaire
    if (idx < 2) return;
    setTimeout(() => {
        const pageDivs = document.querySelectorAll('.page');
        let currentPageIdx = idx;
        let hasPaginated = false;

        while (currentPageIdx < pages.length) {
            const currentPage = pages[currentPageIdx];
            const thisPageDiv = pageDivs[currentPageIdx];
            if (!thisPageDiv) break;
            const chapterObjs = thisPageDiv.querySelector('.chapter-objects');
            if (!chapterObjs) break;

            const pxLimite = 25 * 37.8; // 25 cm en px
            let cumulated = 0;
            let splitAt = -1;
            const children = Array.from(chapterObjs.children);

            for (let i = 0; i < children.length; i++) {
                let h = children[i].offsetHeight;
                if (cumulated + h > pxLimite) {
                    splitAt = i;
                    break;
                }
                cumulated += h;
            }
            if (splitAt > -1) {
                // Découpage : les objets [0..splitAt-1] restent, le reste va à la page suivante
                let overflowObjects = currentPage.objects.slice(splitAt);
                currentPage.objects = currentPage.objects.slice(0, splitAt);

                // Crée ou utilise la page suivante
                let nextPage = pages[currentPageIdx + 1];
                if (!nextPage || nextPage.type !== currentPage.type) {
                    nextPage = { type: currentPage.type, chapterTitle: "", objects: [] };
                    pages.splice(currentPageIdx + 1, 0, nextPage);
                    orientation.splice(currentPageIdx + 1, 0, orientation[currentPageIdx]);
                }
                // Ajoute les objets à la suite des objets de la page suivante
                nextPage.objects = overflowObjects.concat(nextPage.objects);
                hasPaginated = true;
                renderDocument();
                // Relance la pagination sur la page suivante (si elle aussi déborde)
                currentPageIdx++;
            } else {
                break;
            }
        }
        // Après pagination, supprime les pages vides inutiles (hors garde/sommaire)
        if (hasPaginated) {
            for (let i = pages.length - 1; i >= 2; i--) {
                if (!pages[i].objects || pages[i].objects.length === 0) {
                    pages.splice(i, 1);
                    orientation.splice(i, 1);
                }
            }
            renderDocument();
        }
    }, 30);
}

function paginatePage(idx) {
    // Empêche la pagination sur page de garde ou sommaire
    if (idx < 2) return;

    setTimeout(() => {
        const pageDivs = document.querySelectorAll('.page');
        let currentPageIdx = idx;

        // On boucle sur chaque page à partir de idx
        while (currentPageIdx < pages.length) {
            const currentPage = pages[currentPageIdx];
            const thisPageDiv = pageDivs[currentPageIdx];
            if (!thisPageDiv) break;
            const chapterObjs = thisPageDiv.querySelector('.chapter-objects');
            if (!chapterObjs) break;

            const pxLimite = 25 * 37.8;
            let cumulated = 0;
            let splitAt = -1;
            const children = Array.from(chapterObjs.children);
            for (let i = 0; i < children.length; i++) {
                let h = children[i].offsetHeight;
                if (cumulated + h > pxLimite) {
                    splitAt = i;
                    break;
                }
                cumulated += h;
            }
            if (splitAt > -1) {
                // Découpe ici : les objets [0..splitAt-1] restent dans la page
                // le reste passe à la page suivante
                let overflowObjects = currentPage.objects.slice(splitAt);
                currentPage.objects = currentPage.objects.slice(0, splitAt);

                // Nouvelle page si besoin
                let nextPage = pages[currentPageIdx + 1];
                if (!nextPage || nextPage.type !== currentPage.type) {
                    nextPage = { type: currentPage.type, chapterTitle: "", objects: [] };
                    pages.splice(currentPageIdx + 1, 0, nextPage);
                    orientation.splice(currentPageIdx + 1, 0, orientation[currentPageIdx]);
                }
                // On place les objets qui débordent en tête de la page suivante
                nextPage.objects = overflowObjects.concat(nextPage.objects);
                renderDocument();
                // On continue sur la page suivante (si elle déborde elle aussi)
                currentPageIdx++;
            } else {
                break; // Rien à paginer, on s'arrête
            }
        }
    }, 30);
}

function updateSelectionClass() {
    // Retirer la classe 'selected' partout
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    // Marquer la page sélectionnée
    let pagesList = document.querySelectorAll('.page');
    if (pagesList[selectedPage]) pagesList[selectedPage].classList.add('selected');
    // Marquer l'objet sélectionné
    if (selectedElement) {
        if (selectedElement.pageIdx === 0 && selectedElement.objIdx === "mainTitle") {
            // Titre principal de la page de garde
            let mainTitles = pagesList[0].querySelectorAll('.doc-title');
            if (mainTitles[1]) mainTitles[1].classList.add('selected');
        } else if (selectedElement.pageIdx >= 2) {
            let objDivs = pagesList[selectedElement.pageIdx].querySelectorAll('.chapter-objects > *');
            if (objDivs[selectedElement.objIdx]) objDivs[selectedElement.objIdx].classList.add('selected');
        }
    }
}

function deleteSelected() {
    if (!selectedElement) return;
    const { pageIdx, objIdx } = selectedElement;
    if (pageIdx >= 2 && typeof objIdx === "number") {
        let page = pages[pageIdx];
        if (Array.isArray(page.objects) && objIdx < page.objects.length) {
            page.objects.splice(objIdx, 1);
            selectedElement = null;
            renderDocument();
        }
    }
}

/* ------- Fonctions de mise en forme RTE -------- */
function formatDoc(cmd) {
    document.execCommand(cmd, false, null);
}
function setColor(color) {
    document.execCommand("foreColor", false, color);
}
function setFontSize(sz) {
    document.execCommand("fontSize", false, 7); // hack : 7 = custom, ajuster par CSS
    let sel = window.getSelection();
    if (!sel.rangeCount) return;
    let el = sel.anchorNode.parentNode;
    el.style.fontSize = sz;
}

/* ------- Drag & drop pour objets outils ------- */
function setupDragNDrop() {
    // objets outils
    document.querySelectorAll('#draggable-objects .draggable').forEach(el => {
        el.addEventListener('dragstart', evt => {
            evt.dataTransfer.setData("type", el.dataset.type);
        });
    });
    // TODO : pictos...
}

/* ------- Ajout / suppression de pages -------- */
function addPage() {
    pages.push({
        type: 'custom',
        objects: []
    });
    orientation.push("portrait");
    renderDocument();
}
function deletePage(idx=null) {
    if (selectedPage === 0 || selectedPage === 1) {
        alert("Impossible de supprimer la page de garde ou le sommaire !");
        return;
    }
    if (pages.length <= 2) return; // Il faut toujours au moins 2 pages
    pages.splice(selectedPage, 1);
    orientation.splice(selectedPage, 1);
    // Adapter selectedPage
    if (selectedPage >= pages.length) selectedPage = pages.length - 1;
    selectedElement = null;
    renderDocument();
}

/* ------- Changement d’orientation -------- */
function toggleOrientation(idx = null) {
    if (idx === null) idx = selectedPage;
    if (idx === 0 || idx === 1) {
        alert("Impossible de changer l’orientation de la page de garde ou du sommaire.");
        return;
    }
    orientation[idx] = (orientation[idx] === "portrait" ? "landscape" : "portrait");
    renderDocument();
}

/* ------- Rafraîchir (recalcule sommaire) ------- */
function refreshDocument() {
    // Ici, on sauvegarde dans le localStorage, puis reload.
    localStorage.setItem('noticeProject', JSON.stringify({ pages, orientation }));
    location.reload();
}

/* ------- Sauvegarder / Charger JSON ------- */
function saveJSON() {
    const data = JSON.stringify({ pages, orientation });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {type: "application/json"}));
    a.download = "notice.json";
    a.click();
}
function openJSONFile(input) {
    const file = input.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = evt => {
        let data = JSON.parse(evt.target.result);
        pages = data.pages || [];
        orientation = data.orientation || [];
        renderDocument();
    };
    reader.readAsText(file);
}
