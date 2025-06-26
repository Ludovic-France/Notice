/* ----------- Données et variables globales ----------- */
let selectedPage = 0;
let pages = []; // Contient les pages de la notice
let selectedElement = null; // Élément sélectionné
let orientation = []; // Pour chaque page
const INDEX_REV = "ENR-063-04"; // Valeur fixe par défaut
const NUM_REF = "900000"; // Modifiable uniquement page 1
const COLOR_DROP = "#eee";
let isResizingCol = false;

// Fonction pour générer des ID uniques pour les nouveaux objets
function generateUniqueId() {
    return 'obj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function normalizeColWidths(tableObj) {
    if (!tableObj.colWidths || tableObj.colWidths.length === 0) return;

    let currentSum = 0;
    // Utiliser une copie pour calculer la somme pour éviter les problèmes avec parseFloat sur des valeurs déjà modifiées
    const widthsToSum = [...tableObj.colWidths];
    widthsToSum.forEach(w => currentSum += parseFloat(w));

    if (currentSum > 0) {
        const factor = 100 / currentSum;
        let runningTotal = 0;
        for (let i = 0; i < tableObj.colWidths.length - 1; i++) {
            const newWidth = parseFloat(widthsToSum[i]) * factor; // Utiliser la largeur originale pour le calcul
            tableObj.colWidths[i] = newWidth.toFixed(2) + "%";
            runningTotal += newWidth;
        }
        tableObj.colWidths[tableObj.colWidths.length - 1] = Math.max(0, (100 - runningTotal)).toFixed(2) + "%";
    } else if (tableObj.colWidths.length > 0) {
        const equalShare = (100 / tableObj.colWidths.length);
        let runningTotal = 0;
        for (let i = 0; i < tableObj.colWidths.length - 1; i++) {
            tableObj.colWidths[i] = equalShare.toFixed(2) + "%";
            runningTotal += equalShare;
        }
        tableObj.colWidths[tableObj.colWidths.length - 1] = Math.max(0, (100 - runningTotal)).toFixed(2) + "%";
    }
}

// ---- Initialisation principale au chargement ----
window.onload = () => {
    initIcons();
    initDocument();
    setupDragNDrop();
    // Initial calculation of chapter numbers and TOC
    updateAllChapterNumbers();
};

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
        ChapitreData.forEach(chapEntry => {
            let pageObjects = [];
            if (chapEntry.H1) {
                pageObjects.push({
                    type: "h1",
                    text: chapEntry.H1,
                    originalText: chapEntry.H1,
                    id: chapEntry.id || generateUniqueId() // Assurer un ID
                });
            }
            // Handle nested H2s if defined with a key like "H2_items"
            if (chapEntry.H2_items && Array.isArray(chapEntry.H2_items)) {
                chapEntry.H2_items.forEach(h2Entry => {
                    if (h2Entry.H2) {
                        pageObjects.push({
                            type: "h2",
                            text: h2Entry.H2,
                            originalText: h2Entry.H2,
                            id: h2Entry.id || generateUniqueId() // Assurer un ID
                        });
                    }
                });
            }
            if (pageObjects.length > 0) {
                pages.push({
                    type: 'chapter',
                    objects: pageObjects
                });
                orientation.push("portrait");
            }
        });
    }
    renderDocument();
}

/* --------- Affichage du document complet ---------- */
function renderDocument() {
    const container = document.getElementById('pages-container');
    container.innerHTML = '';

    pages.forEach((page, idx) => {
        let div = renderPage(page, idx);
        div.onclick = (e) => {
            selectedPage = idx;
            updateSelectionClass();
            e.stopPropagation();
        };
        if (idx === selectedPage) div.classList.add("selected");
        container.appendChild(div);
    });
    updateSelectionClass();
}

/* --------- Affichage d'une page ---------- */
function renderPage(page, idx) {
    let div = document.createElement('div');
    div.className = "page";
    if (orientation[idx] === "landscape") div.classList.add("landscape");

    let header = document.createElement('div');
    header.className = "header";
    let logo = document.createElement('img');
    logo.className = "logo";
    logo.src = (typeof logoData !== "undefined" ? logoData.url : "");
    header.appendChild(logo);
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

    let content = document.createElement('div');
    content.className = "content";

    if (idx === 0) {
        let title = document.createElement('div');
        title.contentEditable = "true";
        title.style.fontSize = "30pt";
        title.className = "doc-title";
        title.innerText = page.title || "Notice : Untel";
        title.addEventListener('blur', function() {
            page.title = title.innerText;
        });
        title.onclick = function(e) {
            selectedElement = { pageIdx: idx, objIdx: "mainTitle", type: "mainTitle" };
            document.querySelectorAll('.selected').forEach(n => n.classList.remove('selected'));
            title.classList.add('selected');
            e.stopPropagation();
        };
        if (selectedElement && selectedElement.pageIdx === idx && selectedElement.objIdx === "mainTitle")
            title.classList.add('selected');
        content.appendChild(title);

        let imgDrop = document.createElement('div');
        imgDrop.className = "img-drop";
        imgDrop.innerHTML = page.img ? `<img src="${page.img}" alt="image">` : '<span>Glissez une image ici</span>';
        imgDrop.ondragover = e => { e.preventDefault(); imgDrop.style.background ="#eef"; };
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
        imgDrop.addEventListener('paste', e => {
            e.preventDefault();
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = () => {
                        imgDrop.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = reader.result;
                        img.style.maxWidth  = '100%';
                        img.style.maxHeight = '100%';
                        imgDrop.appendChild(img);
                        page.img = reader.result;
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
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
                            page.img = reader.result;
                        };
                        reader.readAsDataURL(blob);
                    })
                    .catch(console.error);
            }
        });
        content.appendChild(imgDrop);
		let constructeurBlock = document.createElement('div');
		constructeurBlock.className = "constructeur-info";
		constructeurBlock.style.border = "2px solid #000";
		constructeurBlock.style.padding = "10px";
		constructeurBlock.style.marginTop = "20px";
		constructeurBlock.style.fontSize = "12pt";
		constructeurBlock.style.textAlign = "left";
		constructeurBlock.innerHTML = "<b>Constructeur : APA <br>Adresse :</b> 292 Rue de l'Epinette, 76320 CAUDEBEC Lès ELBEUF <br>☎️ +33 2.32.96.26.60";
		content.appendChild(constructeurBlock);
    } else if (idx === 1) {
        let tocOl = document.createElement("ol");
        tocOl.id = "table-of-contents";
        tocOl.style.fontSize = "1.3em";
        tocOl.style.margin   = "0 0 0 24px";
        tocOl.style.padding  = "0";
        let itemsAddedToTOC = 0;
        for (let i = 2; i < pages.length; i++) {
            const p = pages[i];
            if (Array.isArray(p.objects)) {
                p.objects.forEach(obj => {
                    if (/^h[1-4]$/.test(obj.type) && (obj.originalText || obj.text)) {
                        let li = document.createElement("li");
                        const prefix = obj.calculatedPrefix || "";
                        const textValue = obj.originalText || obj.text || "";
                        const pageNumberOfTitle = i + 1;
                        const anchor = document.createElement('a');
                        anchor.href = `#live-title-${obj.id}`;
                        anchor.innerHTML = `<span class="toc-title">${prefix}${textValue}</span><span class="toc-page-num">${pageNumberOfTitle}</span>`;
                        li.appendChild(anchor);
                        const level = parseInt(obj.type[1]);
                        li.style.marginLeft = `${(level - 1) * 20}px`;
                        tocOl.appendChild(li);
                        itemsAddedToTOC++;
                    }
                });
            }
        }
        content.appendChild(tocOl);
        if (itemsAddedToTOC === 0) {
            console.warn("TOC RENDER: No items were added to the TOC during renderPage(idx=1).");
        }
    } else {
        if (!Array.isArray(page.objects)) page.objects = [];
        let objs = document.createElement('div');
        objs.className = "chapter-objects";
        let dropStart = document.createElement('div');
        dropStart.className = "drop-target";
        dropStart.addEventListener('dragover', e => { e.preventDefault(); dropStart.style.background = "#cce2ff"; });
        dropStart.addEventListener('dragleave', e => { dropStart.style.background = COLOR_DROP; });
        dropStart.addEventListener('drop', e => {
            e.preventDefault();
            dropStart.style.background = COLOR_DROP;
            const type = e.dataTransfer.getData("type");
            if (!type) return;
            let newObj = null;
            if (["h1", "h2", "h3", "h4"].includes(type))
                newObj = { type: type, text: type.toUpperCase(), originalText: type.toUpperCase(), id: generateUniqueId() };
            else if (type === "text")
                newObj = { type: "text", html: "Zone de texte" };
            else if (type === "table")
                newObj = { type: "table", rows: [["", "", ""], ["", "", ""], ["", "", ""]] };
            if (!newObj) return;
            page.objects.unshift(newObj);
            renderDocument();
        });
        objs.appendChild(dropStart);

        page.objects.forEach((obj, oid) => {
            let el = null;
            if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
                el = document.createElement("div");
                el.contentEditable = "true";
                el.className = "chapter-title" + (obj.type !== "chapterTitle" ? " " + obj.type : "");
                if (obj.id) {
                    el.id = `live-title-${obj.id}`;
                }
                el.innerText = (obj.calculatedPrefix || "") + (obj.originalText || obj.text || "");
                el.addEventListener("blur", () => {
                    const currentText = el.innerText;
                    const prefix = obj.calculatedPrefix || "";
                    if (currentText.startsWith(prefix)) {
                        obj.originalText = currentText.substring(prefix.length);
                    } else {
                        obj.originalText = currentText;
                    }
                    obj.text = obj.originalText;
                });
            } else if (obj.type === "text") {
                el = document.createElement('div');
                el.contentEditable = "true";
                el.className = "rte-area";
                el.innerHTML = obj.html || "";
                el.addEventListener('blur', function() { obj.html = el.innerHTML; });
            } else if (obj.type === "table") {
				if (obj.headerShaded === undefined) obj.headerShaded = false;
				el = document.createElement('div');
				el.className = "table-container";
				let containerWidth = orientation[selectedPage] === "portrait" ? 710 : 1038;
				let table = document.createElement('table');
				table.className = "page-table";
				table.style.width = containerWidth + "px";
				table.style.maxWidth = containerWidth + "px";
				table.style.tableLayout = "fixed";
				let firstRow = obj.rows.find(r => r && r.length);
				let nbCols = firstRow ? firstRow.length : 2;
				if (!obj.colWidths || obj.colWidths.length !== nbCols) {
					let defaultPx = containerWidth / nbCols;
					obj.colWidths = Array(nbCols).fill(defaultPx);
				} else {
					let total = obj.colWidths.reduce((a, b) => a + parseFloat(b || 0), 0);
                    if (total === 0 && nbCols > 0) { // Handle case where all widths are 0 or invalid
                        let defaultPx = containerWidth / nbCols;
					    obj.colWidths = Array(nbCols).fill(defaultPx);
                        total = containerWidth;
                    }
                    if (total > 0) { // Ensure total is not zero before scaling
					    let scale = containerWidth / total;
					    obj.colWidths = obj.colWidths.map(w => parseFloat(w || 0) * scale);
                    }
				}
				let colgroup = document.createElement('colgroup');
				let accumulated = 0;
				for (let c = 0; c < nbCols; c++) {
					let col = document.createElement('col');
					let width = Math.round(obj.colWidths[c]);
					if (c === nbCols - 1) width = containerWidth - accumulated;
					else accumulated += width;
					obj.colWidths[c] = width;
					col.style.width = width + "px";
					colgroup.appendChild(col);
				}
				table.appendChild(colgroup);
				let tbody = document.createElement('tbody');
				obj.rows.forEach((row, i) => {
					let tr = document.createElement('tr');
					if (i === 0 && obj.headerShaded) {
						tr.style.backgroundColor = "#f5f5f5";
						tr.style.fontWeight = "bold";
					}
					for (let j = 0; j < (row ? row.length : 0); j++) {
						let cellData = row[j];
						if (cellData === null) continue;
						let td = document.createElement('td');
						td.contentEditable = "true";
						td.style.verticalAlign = "middle";
						td.style.overflow = "hidden";
						td.style.position = "relative";
						td.addEventListener('focus', () => {
							const range = document.createRange();
							range.selectNodeContents(td);
							range.collapse(true);
							const sel = window.getSelection();
							sel.removeAllRanges();
							sel.addRange(range);
						});
						if (typeof cellData === "object" && cellData.image) {
							let img = document.createElement('img');
							img.src = cellData.image;
							img.style.width = "100%";
							img.style.height = "100%";
							img.style.objectFit = "contain";
							td.appendChild(img);
						} else {
							if (typeof cellData === "object" && cellData.text) {
								td.innerHTML = cellData.text;
							} else if (typeof cellData === "string") {
								td.innerHTML = cellData;
							} else if (!(typeof cellData === "object" && cellData.image)) {
								td.innerHTML = cellData || "";
							}
						}
						let colspan = (typeof cellData === "object" && cellData.colspan) ? cellData.colspan : 1;
						let align = (typeof cellData === "object" && cellData.align) ? cellData.align : "left";
						td.colSpan = colspan;
						td.style.textAlign = align;
						td.addEventListener('blur', () => {
							if (typeof cellData === "object" && cellData !== null) {
								if (!cellData.image) {
									cellData.text = td.innerHTML;
								}
							} else {
								obj.rows[i][j] = td.innerHTML;
							}
						});
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
									fetch(url).then(r => r.blob()).then(blob => {
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
						td.addEventListener('contextmenu', e => {
							e.preventDefault();
							showTableMenu(e, obj, i, j);
							setTimeout(() => td.focus(), 0);
						});
						if (i === 0 && j < nbCols - 1) {
							let resizer = document.createElement('div');
							resizer.className = "col-resizer";
							Object.assign(resizer.style, {
								position: "absolute", top: "0", right: "-3px", width: "6px",
								height: "100%", cursor: "col-resize", zIndex: "10"
							});
							td.appendChild(resizer);
							resizer.addEventListener('mousedown', e => {
								e.preventDefault();
								const startX = e.pageX;
								const leftC = colgroup.children[j];
								const rightC = colgroup.children[j + 1];
								const wL = parseFloat(obj.colWidths[j]);
								const wR = parseFloat(obj.colWidths[j + 1]);
								document.body.style.cursor = "col-resize";
								function onMove(ev) {
									let d = ev.pageX - startX;
									let nl = wL + d, nr = wR - d;
									if (nl < 30 || nr < 30) return;
									obj.colWidths[j] = nl;
									obj.colWidths[j + 1] = nr;
									leftC.style.width = nl + "px";
									rightC.style.width = nr + "px";
								}
								function onUp() {
									document.removeEventListener('mousemove', onMove);
									document.removeEventListener('mouseup', onUp);
									document.body.style.cursor = "";
								}
								document.addEventListener('mousemove', onMove);
								document.addEventListener('mouseup', onUp);
							});
						}
						tr.appendChild(td);
						if (colspan > 1) {
							for (let k = 1; k < colspan; k++) obj.rows[i][j + k] = null;
							j += colspan - 1;
						}
					}
					tbody.appendChild(tr);
				});
				table.appendChild(tbody);
				el.appendChild(table);
			}

            if (el) {
                el.setAttribute("draggable", "true");
                el.addEventListener('dragstart', function(e) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData('move-obj-oid', oid + "");
                    e.dataTransfer.setData('move-obj-page', idx + "");
                    el.classList.add('dragging');
                });
                el.addEventListener('dragend', function() {
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

            let dropBetween = document.createElement('div');
            dropBetween.className = "drop-target";
            dropBetween.addEventListener('dragover', e => { e.preventDefault(); dropBetween.style.background = "#cce2ff"; });
            dropBetween.addEventListener('dragleave', e => { dropBetween.style.background = COLOR_DROP; });
            dropBetween.addEventListener('drop', e => {
                e.preventDefault();
                dropBetween.style.background = COLOR_DROP;
                const moveOidStr = e.dataTransfer.getData('move-obj-oid');
                const movePageStr = e.dataTransfer.getData('move-obj-page');
                const type = e.dataTransfer.getData("type");

                if (type) {
                    let newObj = null;
                    if (["h1", "h2", "h3", "h4"].includes(type))
                        newObj = { type: type, text: type.toUpperCase(), originalText: type.toUpperCase(), id: generateUniqueId() };
                    else if (type === "text")
                        newObj = { type: "text", html: "Zone de texte" };
                    else if (type === "table")
                        newObj = { type: "table", rows: [["", "", ""], ["", "", ""], ["", "", ""]] };

                    if (newObj) {
                        page.objects.splice(oid + 1, 0, newObj);
                        renderDocument();
                    }
                } else if (moveOidStr !== "" && movePageStr !== "") {
                    const srcPageIdx = parseInt(movePageStr);
                    const srcOid = parseInt(moveOidStr);
                    if (srcPageIdx === idx) {
                        if (srcOid !== oid && srcOid !== oid + 1) {
                            const [objMoved] = page.objects.splice(srcOid, 1);
                            let destOid = (srcOid < oid) ? oid : oid + 1;
                            page.objects.splice(destOid, 0, objMoved);
                            renderDocument();
                        }
                    } else {
                        const srcPage = pages[srcPageIdx];
                        if (srcPage && Array.isArray(srcPage.objects) && srcOid < srcPage.objects.length) {
                            const [objMoved] = srcPage.objects.splice(srcOid, 1);
                            page.objects.splice(oid + 1, 0, objMoved);
                            renderDocument();
                        }
                    }
                }
            });
            objs.appendChild(dropBetween);
        });
        content.appendChild(objs);
    }

    let pagin = document.createElement('div');
    pagin.className = "pagination";
    pagin.innerText = `Page ${idx+1} / ${pages.length}`;
    div.appendChild(content);
    div.appendChild(pagin);

    div.addEventListener('click', function() {
        selectedPage = idx;
        updateSelectionClass();
    });
    if (idx === selectedPage) div.classList.add('selected');
    return div;
}

function updateAllChapterNumbers() {
    let hCounters = [0, 0, 0, 0];
    pages.forEach((page, pageIdx) => {
        if (pageIdx >= 2 && Array.isArray(page.objects)) {
            page.objects.forEach(obj => {
                obj.calculatedPrefix = "";
                if (/^h[1-4]$/.test(obj.type)) {
                    const level = parseInt(obj.type[1]) - 1;
                    hCounters[level]++;
                    for (let k = level + 1; k < 4; k++) {
                        hCounters[k] = 0;
                    }
                    obj.calculatedPrefix = hCounters.slice(0, level + 1).join(".") + ". ";
                }
            });
        }
    });
    renderDocument();
}

function updateSelectionClass() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    let pagesList = document.querySelectorAll('.page');
    if (pagesList[selectedPage]) pagesList[selectedPage].classList.add('selected');
    if (selectedElement) {
        if (selectedElement.pageIdx === 0 && selectedElement.objIdx === "mainTitle") {
            let mainTitles = pagesList[0].querySelectorAll('.doc-title');
            if (mainTitles[1]) mainTitles[1].classList.add('selected');
        } else if (selectedElement.pageIdx >= 0 && pagesList[selectedElement.pageIdx]) {
            if (selectedElement.pageIdx >= 2) {
                 const pageContent = pagesList[selectedElement.pageIdx].querySelector('.chapter-objects');
                 if (pageContent) {
                    const contentElements = Array.from(pageContent.children).filter(child => !child.classList.contains('drop-target'));
                    if (contentElements[selectedElement.objIdx]) {
                         contentElements[selectedElement.objIdx].classList.add('selected');
                    }
                 }
            }
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
function formatDoc(cmd) { document.execCommand(cmd, false, null); }
function setColor(color) { document.execCommand("foreColor", false, color); }
function setFontSize(sz) {
    document.execCommand("fontSize", false, 7);
    let sel = window.getSelection();
    if (!sel.rangeCount) return;
    let el = sel.anchorNode.parentNode;
    el.style.fontSize = sz;
}

/* ------- Drag & drop pour objets outils ------- */
function setupDragNDrop() {
    document.querySelectorAll('#draggable-objects .draggable').forEach(el => {
        el.addEventListener('dragstart', evt => {
            evt.dataTransfer.setData("type", el.dataset.type);
        });
    });
}

/* ------- Ajout / suppression de pages -------- */
function addPage() {
    const newPageObject = { type: 'custom', objects: [] };
    pages.splice(selectedPage + 1, 0, newPageObject);
    orientation.splice(selectedPage + 1, 0, "portrait");
    selectedPage = selectedPage + 1;
    renderDocument();
    updateSelectionClass();
}

function deletePage() {
    if (selectedPage === 0 || selectedPage === 1) {
        alert("Impossible de supprimer la page de garde ou le sommaire !");
        return;
    }
    if (pages.length <= 2) return;
    pages.splice(selectedPage, 1);
    orientation.splice(selectedPage, 1);
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
    URL.revokeObjectURL(a.href);
}

function openJSONFile(input) {
    const file = input.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = evt => {
        try {
            let data = JSON.parse(evt.target.result);
            pages = data.pages || [];
            orientation = data.orientation || [];
            pages.forEach(p => {
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if ((obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) && obj.text && obj.originalText === undefined) {
                            obj.originalText = obj.text;
                        }
                        // Assurer un id unique pour les objets chargés qui n'en auraient pas
                        if ((obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) && !obj.id) {
                            obj.id = generateUniqueId();
                        }
                    });
                }
            });
            selectedPage = 0;
            selectedElement = null;
            updateAllChapterNumbers();
        } catch (e) {
            console.error("Error parsing JSON file:", e);
            alert("Erreur lors de l'ouverture du fichier JSON.");
        }
    };
    reader.readAsText(file);
    input.value = "";
}

/* ------- Gestion des Risques Sélectionnés ------- */
function appliquerRisquesSelectionnes() {
    if (typeof ALL_RISKS === 'undefined' || !Array.isArray(ALL_RISKS)) {
        console.error("ALL_RISKS n'est pas défini ou n'est pas un tableau. Assurez-vous que constante.js est chargé et correct.");
        alert("Erreur : Les définitions des risques ne sont pas chargées ou sont incorrectes.");
        return;
    }

    let contentAddedOverall = false;

    ALL_RISKS.forEach(risque => {
        if (!risque || typeof risque.id === 'undefined' ||
            typeof risque.chapitreTargetName === 'undefined' ||
            typeof risque.titreType === 'undefined' ||
            !/^h[1-4]$/.test(risque.titreType)) {
            console.warn("Objet risque malformé ou type de titre de risque invalide dans ALL_RISKS:", risque);
            return;
        }

        const checkbox = document.getElementById(risque.id);
        if (checkbox && checkbox.checked) {

            const niveauTitreRisque = parseInt(risque.titreType.substring(1));
            let parentTitreType;

            if (niveauTitreRisque > 1) {
                parentTitreType = "h" + (niveauTitreRisque - 1);
            } else {
                console.warn(`Le risque '${risque.titreText}' (type ${risque.titreType}) ne peut pas être inséré car il n'a pas de niveau parent Hn-1 standard. Les risques de type H1 ne sont pas auto-insérables sous un parent.`);
                alert(`Le risque "${risque.titreText}" (${risque.titreType}) ne peut pas être automatiquement placé car il est de niveau H1. Veuillez l'insérer manuellement ou définir un type de titre H2, H3 ou H4 pour le risque.`);
                return; // Passer au risque suivant
            }

            let parentObjectContainer = null;
            let parentObjIndex = -1;
            let insertionPageIndex = -1;

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                if (page.objects && Array.isArray(page.objects)) {
                    for (let j = 0; j < page.objects.length; j++) {
                        const currentObj = page.objects[j];
                        const currentObjText = (currentObj.originalText || currentObj.text || "").trim().toLowerCase();
                        const targetParentName = (risque.chapitreTargetName || "").trim().toLowerCase();

                        if (currentObj.type === parentTitreType && currentObjText === targetParentName) {
                            parentObjectContainer = page.objects;
                            parentObjIndex = j;
                            insertionPageIndex = i;
                            break;
                        }
                    }
                }
                if (parentObjectContainer) break;
            }

            if (parentObjectContainer && parentObjIndex !== -1) {
                // Vérifier si le contenu du risque existe déjà juste après le parent trouvé.
                // Cela nécessite de regarder les objets suivants pour le titre spécifique du risque.
                let alreadyExists = false;
                if (parentObjIndex + 1 < parentObjectContainer.length) {
                    const nextObj = parentObjectContainer[parentObjIndex + 1];
                    if (nextObj.type === risque.titreType &&
                        (nextObj.text === risque.titreText || nextObj.originalText === risque.titreText)) {
                        alreadyExists = true;
                    }
                }
                // Une vérification plus robuste pourrait scanner tous les éléments après le parentObjIndex jusqu'au prochain titre de même niveau ou supérieur que le parent.
                // Pour l'instant, la vérification simple ci-dessus est un bon début.

                if (alreadyExists) {
                    console.log(`Le contenu pour '${risque.titreText}' semble déjà exister sous '${risque.chapitreTargetName}'. Ajout ignoré.`);
                } else {
                    const newTitleObj = {
                        type: risque.titreType,
                        text: risque.titreText,
                        originalText: risque.titreText,
                        id: generateUniqueId()
                    };

                    const newContentObj = {
                        type: "text",
                        html: risque.contenuHTML
                    };

                    // Insérer après l'objet parent
                    parentObjectContainer.splice(parentObjIndex + 1, 0, newTitleObj, newContentObj);
                    contentAddedOverall = true;
                    console.log(`Contenu pour '${risque.titreText}' ajouté sous '${risque.chapitreTargetName}' (type ${parentTitreType}) sur la page ${insertionPageIndex + 1}.`);
                }
            } else {
                console.warn(`Titre parent de type '${parentTitreType}' nommé '${risque.chapitreTargetName}' non trouvé pour le risque '${risque.titreText}'.`);
                alert(`Le titre parent "${risque.chapitreTargetName}" (type ${parentTitreType}) n'a pas été trouvé pour le risque "${risque.titreText}".`);
            }
        }
    });

    if (contentAddedOverall) {
        updateAllChapterNumbers();
        alert("Les nouveaux risques sélectionnés ont été appliqués aux sections correspondantes.");
    } else {
        alert("Aucun nouveau risque à ajouter, ou les sections parentes n'ont pas été trouvées. Vérifiez les cases cochées et les noms/types des titres parents.");
    }
}


// --- Fonctions de Menu Tableau et de Pagination (existantes) ---
function showTableMenu(e, obj, rowIdx, colIdx) {
    let cellData = obj.rows[rowIdx][colIdx];
    if (cellData === null) return;
    let oldMenu = document.getElementById('table-menu-popup');
    if (oldMenu) oldMenu.remove();
    let menu = document.createElement('div');
    menu.id = "table-menu-popup";
    Object.assign(menu.style, {
        position: "fixed", top: e.clientY + "px", left: e.clientX + "px",
        background: "#fff", border: "1px solid #999", borderRadius: "8px",
        zIndex: 10000, boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        fontSize: "1em", padding: "4px 0"
    });
    menu._originTable = e.currentTarget.closest('.table-container').querySelector('table');
    function alignItem(label, align) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, { padding:"6px 18px", cursor:"pointer" });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            let c = obj.rows[rowIdx][colIdx];
            if (typeof c === "object") c.align = align;
            else obj.rows[rowIdx][colIdx] = { text: c, align };
            const td = menu._originTable.rows[rowIdx].cells[colIdx];
            td.style.textAlign = align;
            // restoreCaret(); // Cette fonction n'est pas définie, commenter pour l'instant
            menu.remove();
        };
        menu.appendChild(item);
    }
    alignItem("Aligner à gauche", "left");
    alignItem("Centrer horizontalement", "center");
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
    function menuItem(label, fn) {
        let item = document.createElement('div');
        item.innerText = label;
        item.style.padding = "6px 18px"; item.style.cursor  = "pointer";
        item.onmouseover  = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => { fn(); menu.remove(); renderDocument(); };
        return item;
    }
    menu.appendChild(menuItem(obj.headerShaded ? "Désactiver gris de la 1ʳᵉ ligne" : "Griser la 1ʳᵉ ligne", () => {
        obj.headerShaded = !obj.headerShaded;
    }));
    menu.appendChild(document.createElement('hr'));
    menu.appendChild(structuralItem("Ajouter colonne à droite", () => {
        obj.rows.forEach(row => row.splice(colIdx + 1, 0, ""));
        const w = obj.colWidths[colIdx]; // Problème potentiel si colIdx est la dernière
        obj.colWidths.splice(colIdx + 1, 0, w); // Duplique la largeur, normalisation nécessaire après
        normalizeColWidths(obj); // Appel à la normalisation
	}));
    menu.appendChild(structuralItem("Ajouter ligne dessous", () => {
        let newRow = obj.rows[0].map(() => "");
        obj.rows.splice(rowIdx + 1, 0, newRow);
	}));
   if (obj.rows[0].length > 1) {
        menu.appendChild(structuralItem("Supprimer colonne", () => {
            for (let r = 0; r < obj.rows.length; r++) {
                let cd = obj.rows[r][colIdx];
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
                else if (typeof cd === "object" && cd.colspan > 1) {
                    let text = cd.text || "";
                    obj.rows[r][colIdx] = text;
                    for (let k = 1; k < cd.colspan; k++) {
                        if (obj.rows[r][colIdx + k] !== undefined) obj.rows[r][colIdx + k] = "";
                    }
                }
            }
            obj.rows.forEach(row => row.splice(colIdx, 1));
            obj.colWidths.splice(colIdx, 1); // Supprimer aussi la largeur de colonne
            normalizeColWidths(obj); // Appel à la normalisation
        }));
    }
    if (obj.rows.length > 1) {
        menu.appendChild(structuralItem("Supprimer ligne", () => {
            obj.rows.splice(rowIdx, 1);
        }));
    }
    if (colIdx < obj.rows[rowIdx].length - 1 && obj.rows[rowIdx][colIdx+1] !== null) { // S'assurer qu'il y a une cellule à droite et qu'elle n'est pas déjà partie d'une fusion
        menu.appendChild(structuralItem("Fusionner à droite", () => {
            let cur = obj.rows[rowIdx][colIdx];
            let next = obj.rows[rowIdx][colIdx + 1];
            let currentText = (typeof cur === "object" && !cur.image) ? cur.text : (cur || "");
            let nextText = (typeof next === "object" && !next.image) ? next.text : (next || "");
            let newColspan = ((typeof cur === "object" && cur.colspan) ? cur.colspan : 1) +
                             ((typeof next === "object" && next.colspan) ? next.colspan : 1);

            obj.rows[rowIdx][colIdx] = {
                text: currentText + " " + nextText,
                colspan: newColspan,
                align: (typeof cur === "object" ? cur.align : "left") // Conserver l'alignement de la cellule de gauche
            };
            // Marquer les cellules suivantes comme null pour la fusion
            for(let k=1; k < newColspan; k++){
                if(colIdx + k < obj.rows[rowIdx].length) {
                     obj.rows[rowIdx][colIdx+k] = null;
                }
            }
            // Recalculer proprement les indices pour splice si d'autres fusions existent
            let cellsToRemove = ((typeof next === "object" && next.colspan) ? next.colspan : 1);
            obj.rows[rowIdx].splice(colIdx + 1, cellsToRemove);


        }));
    }
    if (typeof cellData === "object" && cellData.colspan > 1) {
        menu.appendChild(structuralItem("Scinder cellule", () => {
            let n = cellData.colspan;
            let currentText = cellData.text || "";
            // Diviser le texte approximativement si possible (simpliste)
            let partText = currentText.substring(0, Math.ceil(currentText.length / n));
            obj.rows[rowIdx][colIdx] = {text: partText, align: cellData.align}; // Remettre la première partie

            for (let i = 1; i < n; i++) {
                 // Insérer des cellules vides pour les parties scindées
                obj.rows[rowIdx].splice(colIdx + i, 0, {text: "", align: cellData.align});
            }
        }));
    }
    document.body.appendChild(menu);
    document.addEventListener('mousedown', function hideMenu(ev) {
        if (menu && !menu.contains(ev.target)) { // Vérifier si menu existe encore
            menu.remove();
            document.removeEventListener('mousedown', hideMenu);
        }
    }, { once: false }); // {once: true} peut être problématique si le menu est recréé rapidement
}

function paginateObjects(idx) {
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
            const pxLimite = 25 * 37.8;
            let cumulated = 0;
            let splitAt = -1;
            const children = Array.from(chapterObjs.children);
            for (let i = 0; i < children.length; i++) {
                if (children[i].classList.contains('drop-target')) continue; // Ignorer les drop-targets dans le calcul de hauteur
                let h = children[i].offsetHeight;
                if (cumulated + h > pxLimite) {
                    // Trouver l'index de l'objet correspondant dans currentPage.objects
                    // Les enfants de chapterObjs sont [drop, obj, drop, obj, ...]
                    // L'objet réel est à (i-1)/2 si i est l'index de l'élément visuel (el)
                    // Ou plutôt, on compte les éléments réels
                    let realObjIndex = 0;
                    let currentChildIndex = 0;
                    for(let k=0; k < children.length; k++){
                        if(!children[k].classList.contains('drop-target')){
                            if(currentChildIndex === i) break;
                            realObjIndex++;
                        }
                        currentChildIndex++;
                    }
                    splitAt = realObjIndex;
                    break;
                }
                if(!children[i].classList.contains('drop-target')) cumulated += h;
            }
            if (splitAt > -1 && splitAt < currentPage.objects.length) { // S'assurer que splitAt est valide
                let overflowObjects = currentPage.objects.slice(splitAt);
                currentPage.objects = currentPage.objects.slice(0, splitAt);
                let nextPage = pages[currentPageIdx + 1];
                if (!nextPage || nextPage.type !== currentPage.type) { //TODO: vérifier si le type de page doit être identique
                    nextPage = { type: 'chapter', objects: [] }; // Type par défaut pour une nouvelle page de contenu
                    pages.splice(currentPageIdx + 1, 0, nextPage);
                    orientation.splice(currentPageIdx + 1, 0, orientation[currentPageIdx]);
                }
                nextPage.objects = overflowObjects.concat(nextPage.objects);
                hasPaginated = true;
                // Il faut re-rendre pour que les mesures de la page suivante soient correctes
                renderDocument(); // Potentiellement coûteux, mais nécessaire pour la précision
                currentPageIdx++;
            } else {
                break;
            }
        }
        if (hasPaginated) {
            for (let i = pages.length - 1; i >= 2; i--) {
                if (pages[i].objects && pages[i].objects.length === 0 && pages[i].type !== 'cover' && pages[i].type !== 'toc') {
                    pages.splice(i, 1);
                    orientation.splice(i, 1);
                }
            }
            updateAllChapterNumbers(); // Appel final pour tout recalculer et re-rendre
        }
    }, 100); // Augmenter le délai pour s'assurer que le DOM est stable
}

function exportCleanHTML() {
    let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Export Notice</title>
    <style>
        body { background: #fff; font-family: 'Segoe UI', 'Arial', sans-serif; font-size: 12pt; margin: 0; padding: 0; }
        .page { width: 210mm; min-height: 297mm; max-width: 210mm; /*max-height: 297mm;*/ box-sizing: border-box !important; box-shadow: none !important; border: 1px solid #555 !important; border-radius: 3px !important; margin: 0 auto 10mm auto !important; padding: 10mm 15mm 10mm 15mm !important; overflow: visible !important; /* Changed from hidden for full content */ display: flex !important; flex-direction: column !important; position: relative !important; page-break-after: always !important; }
        .page:last-child { page-break-after: avoid !important; margin-bottom: 0 !important; }
        .page.landscape { width: 297mm !important; min-height: 210mm !important; max-width: 297mm !important; /*max-height: 210mm !important;*/ }
        .header { background: #fff !important; border-bottom: 1px solid #000 !important; padding: 0 0 10px 0 !important; height: auto !important; box-sizing: border-box !important; display: flex; align-items: flex-end; justify-content: space-between; }
        .header .logo { height: 60px; width: 60px; object-fit: contain; }
        .header .doc-title { flex: 1; margin: 0 18px; font-size: 24pt !important; font-weight: bold; text-align: center; color: #000 !important; }
        .header .revision { min-width: 60px; text-align: right; font-size: 12pt; color: #000 !important; }
        .header .revision .index, .header .revision .num { color: #000 !important; }
        .page .content { flex-grow: 1 !important; padding: 10px 0 0 0 !important; /* overflow: hidden !important; */ gap: 12px !important; box-sizing: border-box !important; width: 100% !important; display: flex; flex-direction: column; align-items: normal; }
        .page .pagination { display: block !important; position: absolute !important; bottom: 5mm !important; left: 15mm !important; right: 15mm !important; text-align: right !important; font-size: 10pt !important; color: #000 !important; width: auto !important; }
        .page .img-drop { border: none !important; min-height: 10cm; max-height: 15cm; width: 100%; background: #fff !important; display: flex; justify-content: center; align-items: center; margin: 20px auto; }
        .page .img-drop img { max-width: 100% !important; max-height: 100% !important; height: auto !important; object-fit: contain; }
        .rte-area { background: #fff !important; border: none !important; min-height: auto; padding: 0; }
        .page-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; margin: 10px 0; }
        .page-table th, .page-table td { border: 1px solid #000 !important; padding: 5px 8px; word-break: break-word; vertical-align: middle; text-align: left; }
        .page-table th { background: #eee !important; font-weight: bold; }
        .page .chapter-title, .page .h1, .page .h2, .page .h3, .page .h4 { color: #000 !important; font-weight: bold; margin: 20px 0 10px 0; }
        .page h1, .page .h1 { font-size: 22pt !important; } .page h2, .page .h2 { font-size: 18pt !important; }
        .page h3, .page .h3 { font-size: 16pt !important; } .page h4, .page .h4 { font-size: 14pt !important; }
        .cover-title { font-size: 30pt; text-align: center; margin: 40px 0; }
        #table-of-contents { list-style-type: none; padding-left: 0; font-size: 1.2em; }
        #table-of-contents li { margin-bottom: 5px; }
        #table-of-contents .toc-title { display: inline-block; width: 90%; }
        #table-of-contents .toc-page-num { display: inline-block; width: 10%; text-align: right; }
    </style>
</head>
<body>
`;
    pages.forEach((pageData, idx) => {
        const pageOrientation = orientation[idx] || 'portrait';
        html += `<div class="page ${pageOrientation === 'landscape' ? 'landscape' : ''}">`;
        html += `<div class="header"><img class="logo" src="${(typeof logoData !== "undefined" && logoData.url) ? logoData.url : ''}" alt="Logo"><div class="doc-title">${pages[0].docTitle || "Titre du document"}</div><div class="revision"><div class="index">${INDEX_REV}</div><div class="num">${pages[0].editableNum || NUM_REF}</div></div></div>`;
        html += `<div class="content">`;
        if (idx === 0) {
            html += `<div class="cover-title">${pageData.title || "Notice"}</div>`;
            if (pageData.img) {
                html += `<div class="img-drop"><img src="${pageData.img}" alt="Image de couverture"></div>`;
            }
            // Ajout du bloc constructeur pour l'export aussi
            html += `<div class="constructeur-info" style="border: 2px solid #000; padding: 10px; margin-top: 20px; font-size: 12pt; text-align: left;"><b>Constructeur : APA <br>Adresse :</b> 292 Rue de l'Epinette, 76320 CAUDEBEC Lès ELBEUF <br>☎️ +33 2.32.96.26.60</div>`;

        } else if (idx === 1) {
            html += `<h2>Sommaire</h2>`;
            html += `<ol id="table-of-contents">`;
            for (let i = 2; i < pages.length; i++) {
                const p = pages[i];
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if (/^h[1-4]$/.test(obj.type) && (obj.originalText || obj.text) && obj.id) {
                            const prefix = obj.calculatedPrefix || "";
                            const textValue = obj.originalText || obj.text || "";
                            const level = parseInt(obj.type[1]);
                            const pageNumberOfTitleExport = i + 1;
                            const anchorId = `export-title-${obj.id}`;
                            html += `<li style="margin-left: ${(level - 1) * 20}px;"><a href="#${anchorId}"><span class="toc-title">${prefix}${textValue}</span><span class="toc-page-num">${pageNumberOfTitleExport}</span></a></li>`;
                        }
                    });
                }
            }
            html += `</ol>`;
        } else {
            if (Array.isArray(pageData.objects)) {
                pageData.objects.forEach(obj => {
                    if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
                        const prefix = obj.calculatedPrefix || "";
                        const text = obj.originalText || obj.text || "";
                        const anchorId = obj.id ? `export-title-${obj.id}` : '';
                        html += `<div class="${obj.type}" ${anchorId ? `id="${anchorId}"` : ''}>${prefix}${text}</div>`;
                    } else if (obj.type === "text") {
                        html += `<div class="rte-area">${obj.html || ""}</div>`;
                    } else if (obj.type === "table") {
                        let tableStyle = 'width:100%;';
                        html += `<table class="page-table" style="${tableStyle}">`;
                        if (obj.colWidths && Array.isArray(obj.colWidths) && obj.colWidths.length > 0) {
                            html += `<colgroup>`;
                            let totalWidthDefined = obj.colWidths.reduce((sum, w) => sum + parseFloat(w || 0), 0);
                            if (totalWidthDefined > 0) {
                                obj.colWidths.forEach(widthPx => {
                                    const percent = (parseFloat(widthPx || 0) / totalWidthDefined) * 100;
                                    html += `<col style="width: ${percent.toFixed(2)}%;">`;
                                });
                            } else { // Fallback if widths are not properly defined
                                const equalPercent = 100 / obj.colWidths.length;
                                obj.colWidths.forEach(() => html += `<col style="width: ${equalPercent.toFixed(2)}%;">`);
                            }
                            html += `</colgroup>`;
                        }
                        if (Array.isArray(obj.rows)) {
                            obj.rows.forEach((row, rowIndex) => {
                                html += `<tr>`;
                                if (Array.isArray(row)) {
                                    row.forEach(cell => {
                                        if (cell === null) return;
                                        const cellTag = (rowIndex === 0 && obj.headerShaded) ? 'th' : 'td';
                                        let cellContent = '';
                                        let colspan = 1;
                                        let textAlign = 'left';
                                        if (typeof cell === "object" && cell !== null) {
                                            if (cell.image) {
                                                cellContent = `<img src="${cell.image}" style="max-width:100%; height:auto; display:block;">`;
                                            } else {
                                                cellContent = cell.text || "";
                                            }
                                            colspan = cell.colspan || 1;
                                            textAlign = cell.align || 'left';
                                        } else {
                                            cellContent = cell || "";
                                        }
                                        html += `<${cellTag} colspan="${colspan}" style="text-align:${textAlign};">${cellContent}</${cellTag}>`;
                                    });
                                }
                                html += `</tr>`;
                            });
                        }
                        html += `</table>`;
                    }
                });
            }
        }
        html += `</div>`;
        html += `<div class="pagination">Page ${idx + 1} / ${pages.length}</div>`;
        html += `</div>`;
    });
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notice_export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// La fonction paginatePage est un alias ou une version précédente de paginateObjects.
// Je vais la laisser pour l'instant au cas où elle serait appelée ailleurs, mais paginateObjects semble plus complète.
// Idéalement, il faudrait consolider.
function paginatePage(idx) {
    paginateObjects(idx);
}

[end of app.js]
