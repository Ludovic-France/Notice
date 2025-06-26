/* ----------- Données et variables globales ----------- */
let selectedPage = 0;
let pages = []; // Contient les pages de la notice
let selectedElement = null; // Élément sélectionné
let orientation = []; // Pour chaque page
const INDEX_REV = "ENR-063-04"; // Valeur fixe par défaut
const NUM_REF = "900000"; // Modifiable uniquement page 1
const COLOR_DROP = "#eee";
let isResizingCol = false;

function normalizeColWidths(tableObj) {
    if (!tableObj.colWidths || tableObj.colWidths.length === 0)
        return;

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

// Pour les chapitres (chapterTitle)
// let chapterCounter = 0; // Commented out: No longer global for on-the-fly rendering

// Pour les titres H1→H4
// const hCounters = [0, 0, 0, 0];  // Commented out: No longer global for on-the - fly rendering

// ---- Initialisation principale au chargement ----
window.onload = () => {
    initIcons();
    initDocument();
    setupDragNDrop();
    // Initial calculation of chapter numbers and TOC
    updateAllChapterNumbers();
};

// /**
//  * Calcule le numéro de chapitre (chapterTitle) pour la page pageIndex
//  * en comptant toutes les occurences de chapterTitle dans pages[2..pageIndex]
//  * et renvoie ce compteur (1-based).
//  */
// function chapterCounterForTOC(pages, pageIndex) { // Commented out: Logic moved to updateAllChapterNumbers
//   let count = 0;
//   for (let i = 2; i <= pageIndex && i < pages.length; i++) {
//     const p = pages[i];
//     if (!Array.isArray(p.objects)) continue;
//     for (const obj of p.objects) {
//       if (obj.type === "chapterTitle") {
//         count++;
//         // si c'est dans la page cible, on a notre numéro
//         if (i === pageIndex) return count;
//       }
//     }
//   }
//   return count;
// }

// /**
//  * Calcule le tableau [h1,h2,h3,h4] pour la page pageIndex / un titre Hn
//  * en simulant le même incrément/réinit que dans le renderPage.
//  */
// function headingCountersForTOC(pages, pageIndex, targetObj) { // Commented out: Logic moved to updateAllChapterNumbers
//   const counters = [0, 0, 0, 0];
//   outer:
//   for (let i = 2; i <= pageIndex && i < pages.length; i++) {
//     const p = pages[i];
//     if (!Array.isArray(p.objects)) continue;
//     for (const obj of p.objects) {
//       if (!/^h[1-4]$/.test(obj.type)) continue;
//       const lvl = parseInt(obj.type[1], 10) - 1;
//       // incrémente et reset des niveaux inférieurs
//       counters[lvl]++;
//       for (let k = lvl+1; k < 4; k++) counters[k] = 0;
//       // si c'est l'objet qu'on veut numéroter (même référence)
//       if (i === pageIndex && obj === targetObj) {
//         break outer;
//       }
//     }
//   }
//   return counters;
// }

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
                    originalText:
                    chapEntry.H1,
                    id: chapEntry.id
                });
            }
            // Handle nested H2s if defined with a key like "H2_items"
            if (chapEntry.H2_items && Array.isArray(chapEntry.H2_items)) {
                chapEntry.H2_items.forEach(h2Entry => {
                    if (h2Entry.H2) {
                        pageObjects.push({
                            type: "h2",
                            text: h2Entry.H2,
                            origina
                            lText: h2Entry.H2,
                            id: h2Entry.id
                        });
                    }
                });
            }
            // Add more specific H3, H4 handling if your data structure has them
            at this initial level

            if (pageObjects.length > 0) {
                pages.push({
                    type: 'chapter', // Keep a general page type, or adapt if ne
                    eded
                    objects: pageObjects
                });
                orientation.push("portrait");
            }
        });
    }
    renderDocument();
    // updateAllChapterNumbers will be called by window.onload after initDocumen
    t
}

/* --------- Affichage du document complet ---------- */
function renderDocument() {
    const container = document.getElementById('pages-container');
    container.innerHTML = '';

    pages.forEach((page, idx) => {
        let div = renderPage(page, idx); // récupère le conteneur
        div.onclick = (e) => {
            selectedPage = idx;
            updateSelectionClass();
            e.stopPropagation(); // évite sélection multiple
        };
        if (idx === selectedPage)
            div.classList.add("selected");
        container.appendChild(div);
    });
    updateSelectionClass();
}

/* --------- Affichage d'une page ---------- */
function renderPage(page, idx) {
    // Conteneur principal de la page
    let div = document.createElement('div');
    div.className = "page";
    if (orientation[idx] === "landscape")
        div.classList.add("landscape");

    // ---- En-tête ----
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
        docTitle.addEventListener('blur', function () {
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
        <div class="num" contenteditable="${idx === 0 ? 'true' : 'false'}" spell
check="false">${pages[0].editableNum || "900000"}</div>
    `;
    if (idx === 0) {
        let numDiv = revBox.querySelector('.num');
        numDiv.addEventListener('blur', function () {
            pages[0].editableNum = numDiv.innerText;
        });
    }
    header.appendChild(revBox);
    div.appendChild(header);

    let content = document.createElement('div');
    content.className = "content";

    if (idx === 0) { // Page de Garde
        let title = document.createElement('div');
        title.contentEditable = "true";
        title.style.fontSize = "30pt";
        title.className = "doc-title";
        title.innerText = page.title || "Notice : Untel";
        title.addEventListener('blur', function () {
            page.title = title.innerText;
        });
        title.onclick = function (e) {
            selectedElement = {
                pageIdx: idx,
                objIdx: "mainTitle",
                type: "mainTi
                tle"
            };
            document.querySelectorAll('.selected').forEach(n => n.classList.remo
                ve('selected'));
            title.classList.add('selected');
            e.stopPropagation();
        };
        if (selectedElement && selectedElement.pageIdx === idx && selectedElemen
            t.objIdx === "mainTitle")
            title.classList.add('selected');
        content.appendChild(title);

        let imgDrop = document.createElement('div');
        imgDrop.className = "img-drop";
        imgDrop.innerHTML = page.img ? `<img src="${page.img}" alt="image">` : '
            <span>Glissez une image ici</span>';
        imgDrop.ondragover = e => {
            e.preventDefault();
            imgDrop.style.background
                 = "#eef";
        };
        imgDrop.ondragleave = e => {
            imgDrop.style.background = "";
        };
        imgDrop.ondrop = e => {
            e.preventDefault();
            imgDrop.style.background = "";
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image')) {
                let reader = new FileReader();
                reader.onload = evt => {
                    page.img = evt.target.result;
                    renderDocument(); // Could potentially call updateAllChapter
                    Numbers if structure changes affect numbering
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
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        imgDrop.appendChild(img);
                        page.img = reader.result; // Save pasted image
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
            const url = e.clipboardData.getData('text/uri-list') || e.clipboardD
                ata.getData('text/plain');
            if (url && /^https?:\/\//.test(url)) {
                fetch(url)
                .then(r => r.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        imgDrop.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = reader.result;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        imgDrop.appendChild(img);
                        page.img = reader.result; // Save pasted image from
                        URL
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(console.error);
            }
        });
        content.appendChild(imgDrop);
        // Ajout du bloc Constructeur
        let constructeurBlock = document.createElement('div');
        constructeurBlock.className = "constructeur-info";
        constructeurBlock.style.border = "2px solid #000";
        constructeurBlock.style.padding = "10px";
        constructeurBlock.style.marginTop = "20px";
        constructeurBlock.style.fontSize = "12pt";
        constructeurBlock.style.textAlign = "left";
        constructeurBlock.innerHTML = "<b>Constructeur : APA <br>Adresse
            :</b> 292 Rue de l'Epinette, 76320 CAUDEBEC Lès ELBEUF <br>☎️ +33 2.32.96.26.60
            ";

        content.appendChild(constructeurBlock);
    } else if (idx === 1) { // Sommaire
        // The TOC is now generated by generateTableOfContents(), called by upda
        teAllChapterNumbers()
        // This section will just create the container for the TOC.
        let tocOl = document.createElement("ol");
        tocOl.id = "table-of-contents";
        tocOl.style.fontSize = "1.3em";
        tocOl.style.margin = "0 0 0 24px";
        tocOl.style.padding = "0";

        // Populate TOC directly here
        let itemsAddedToTOC = 0;
        for (let i = 2; i < pages.length; i++) { // Start from page 2 (actual co
            ntent pages)
            const p = pages[i];
            if (Array.isArray(p.objects)) {
                p.objects.forEach(obj => {
                    if (/^h[1-4]$/.test(obj.type) && (obj.originalText || obj.te
                            xt)) {
                        let li = document.createElement("li");
                        const prefix = obj.calculatedPrefix || "";
                        const textValue = obj.originalText || obj.text || "";
                        const pageNumberOfTitle = i + 1; // i est l'index de la
                        page contenant le titre

                        const anchor = document.createElement('a');
                        anchor.href = `#live-title-${obj.id}`; // Lien vers l'an
                        cre
                        // Utilisation de table-like layout avec CSS pour aligne
                        r les numéros de page à droite
                        anchor.innerHTML = `<span class="toc-title">${prefix}${t
                            extValue}</span><span class="toc-page-num">${pageNumberOfTitle}</span>`;
                        li.appendChild(anchor);

                        const level = parseInt(obj.type[1]); // 1 for H1, 2 for
                        H2,
                        etc.
                        li.style.marginLeft = `${(level - 1) * 20}px`;

                        tocOl.appendChild(li);
                        itemsAddedToTOC++;
                    }
                });
            }
        }
        content.appendChild(tocOl); // Add the populated OL to the content

        if (itemsAddedToTOC === 0) {
            console.warn("TOC RENDER: No items were added to the TOC during rend
                erPage(idx=1).");
        }

    } else { // Autres pages
        if (!Array.isArray(page.objects))
            page.objects = [];
        let objs = document.createElement('div');
        objs.className = "chapter-objects";

        let dropStart = document.createElement('div');
        dropStart.className = "drop-target";
        dropStart.addEventListener('dragover', e => {
            e.preventDefault();
            dropSt
            art.style.background = "#cce2ff";
        });
        dropStart.addEventListener('dragleave', e => {
            dropStart.style.backgroun
            d = COLOR_DROP;
        });
        dropStart.addEventListener('drop', e => {
            e.preventDefault();
            dropStart.style.background = COLOR_DROP;
            const type = e.dataTransfer.getData("type");
            if (!type)
                return;
            let newObj = null;
            if (["h1", "h2", "h3", "h4"].includes(type))
                newObj = {
                    type: type,
                    text: type.toUpperCase(),
                    originalText: t
                    ype.toUpperCase()
                }; // Store original text
            else if (type === "text")
                newObj = {
                    type: "text",
                    html: "Zone de texte"
                };
            else if (type === "table")
                newObj = {
                    type: "table",
                    rows: [["", "", ""], ["", "", ""], ["", "", ""]]
                };
            if (!newObj)
                return;
            page.objects.unshift(newObj);
            renderDocument(); // Re-render, numbering will be updated by manual
            button
        });
        objs.appendChild(dropStart);

        page.objects.forEach((obj, oid) => {
            let el = null;
            if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
                el = document.createElement("div");
                el.contentEditable = "true";
                el.className = "chapter-title" + (obj.type !== "chapterTitle" ?
                        " " + obj.type : "");
                // Assign ID for anchor
                if (obj.id) { // Ensure obj.id exists
                    el.id = `live-title-${obj.id}`;
                }
                // Display stored prefix + original text
                el.innerText = (obj.calculatedPrefix || "") + (obj.originalText
                     || obj.text || "");
                el.addEventListener("blur", () => {
                    // Save only the text part, not the prefix
                    const currentText = el.innerText;
                    const prefix = obj.calculatedPrefix || "";
                    if (currentText.startsWith(prefix)) {
                        obj.originalText = currentText.substring(prefix.length);
                    } else {
                        obj.originalText = currentText;
                    }
                    obj.text = obj.originalText; // Keep obj.text consistent if
                    other parts of code use it
                    // No re-render or re-numbering here, wait for manual update
                });
            } else if (obj.type === "text") {
                el = document.createElement('div');
                el.contentEditable = "true";
                el.className = "rte-area";
                el.innerHTML = obj.html || "";
                el.addEventListener('blur', function () {
                    obj.html = el.innerHTML;
                });
            } else if (obj.type === "table") {
                if (obj.headerShaded === undefined)
                    obj.headerSh
                    aded = false;
                el = document.createElement('div');
                el.className = "table-container";

                // Déterminer l'orientation de la page
                let containerWidth = 710;
                if (orientation[selectedPage] === "portrait") {
                    containerWidth = 710;
                } else if (orientation[selectedPage] === "landsc
                    ape") {
                    containerWidth = 1038;
                }

                let table = document.createElement('table');
                table.className = "page-table";
                table.style.width = containerWidth + "px";
                table.style.maxWidth = containerWidth + "px";
                table.style.tableLayout = "fixed";

                let firstRow = obj.rows.find(r => r && r.length);
                let nbCols = firstRow ? firstRow.length : 2;

                if (!obj.colWidths || obj.colWidths.length !== n
                    bCols) {
                    let defaultPx = containerWidth / nbCols;
                    obj.colWidths = Array(nbCols).fill(defau
                            ltPx);
                } else {
                    let total = obj.colWidths.reduce((a, b)
                             => a + b, 0);
                    let scale = containerWidth / total;
                    obj.colWidths = obj.colWidths.map(w => w
                             * scale);
                }

                let colgroup = document.createElement('colgroup');
                let accumulated = 0;
                for (let c = 0; c < nbCols; c++) {
                    let col = document.createElement('col');
                    let width = Math.round(obj.colWidths[c]);
                    if (c === nbCols - 1)
                        width = containerW
                            idth - accumulated;
                    else
                        accumulated += width;
                    obj.colWidths[c] = width;
                    col.style.width = width + "px";
                    colgroup.appendChild(col);
                }
                table.appendChild(colgroup);
                let tbody = document.createElement('tbody');
                obj.rows.forEach((row, i) => {
                    let tr = document.createElement('tr');
                    if (i === 0 && obj.headerShaded) {
                        tr.style.backgroundColor = "#f5f
                            5f5";
                        tr.style.fontWeight = "bold";
                    }
                    for (let j = 0; j < (row ? row.length :
                            0); j++) {
                        let cellData = row[j];
                        if (cellData === null)
                            continue;
                        let td = document.createElement(
                                'td');
                        td.contentEditable = "true";
                        td.style.verticalAlign = "middle
                            ";
                        td.style.overflow = "hidden";
                        td.style.position = "relative";
                        td.addEventListener('focus', ()
                             => {
                            const range = document.c
                                reateRange();
                            range.selectNodeContents
                            (td);
                            range.collapse(true);
                            const sel = window.getSe
                                lection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        });
                        if (typeof cellData === "object"
                             && cellData.image) {
                            let img = document.creat
                                eElement('img');
                            img.src = cellData.image;
                            img.style.width = "100%";
                            img.style.height = "100%
                                ";
                            img.style.objectFit = "c
                                ontain";
                            td.appendChild(img);
                        } else {
                            let text = typeof cellDa
                                ta === "object" ? cellData.text : cellData;
                            td.innerHTML = text; // M
                            ODIFIÉ: innerText->innerHTML
                        }
                        let colspan = (typeof cellData =
                                 == "object" && cellData.colspan) ? cellData.colspan : 1;
                        let align = (typeof cellData ===
                            "object" && cellData.align) ? cellData.align : "left";
                        td.colSpan = colspan;
                        td.style.textAlign = align;
                        td.addEventListener('blur', () =
                                 > {
                                if (typeof cellData ===
                                    "object") {
                                    if (!cellData.im
                                        age)
                                        cellData.text = td.innerHTML; // MODIFIÉ: innerText -> innerHTML
                                } else {
                                    obj.rows[i][j] =
                                        td.innerHTML; // MODIFIÉ: innerText -> innerHTML
                                }
                            });
                        td.addEventListener('paste', e =
                                 > {
                                e.preventDefault();
                                for (let it of e.clipboa
                                    rdData.items) {
                                    if (it.kind ===
                                        "file" && it.type.startsWith("image/")) {
                                        let file
                                             = it.getAsFile();
                                        let read
                                        er = new FileReader();
                                        reader.o
                                        nload = () => {

                                            td.innerHTML = "";

                                            let img = document.createElement('img');

                                            img.src = reader.result;

                                            img.style.width = "100%";

                                            img.style.height = "100%";

                                            img.style.objectFit = "contain";

                                            td.appendChild(img);

                                            if (typeof cellData === "object")
                                                cellData.image = reader.result;
                                            else
                                                obj.rows[i][j] = {
                                                    image: reader.result
                                                };
                                        };
                                        reader.r
                                        eadAsDataURL(file);
                                        break;
                                    }
                                }
                            });
                        td.addEventListener('dragover',
                            e => e.preventDefault());
                        td.addEventListener('drop', e => {
                            e.preventDefault();
                            if (e.dataTransfer.files
                                .length) {
                                let file = e.dat
                                    aTransfer.files[0];
                                if (file.type.st
                                    artsWith("image/")) {
                                    let read
                                    er = new FileReader();
                                    reader.o
                                    nload = () => {

                                        td.innerHTML = "";

                                        let img = document.createElement('img');

                                        img.src = reader.result;

                                        img.style.width = "100%";

                                        img.style.height = "100%";

                                        img.style.objectFit = "contain";

                                        td.appendChild(img);

                                        if (typeof cellData === "object")
                                            cellData.image = reader.result;
                                        else
                                            obj.rows[i][j] = {
                                                image: reader.result
                                            };
                                    };
                                    reader.r
                                    eadAsDataURL(file);
                                }
                            } else {
                                let url = e.data
                                    Transfer.getData('text/uri-list')
                                     || e.dat
                                    aTransfer.getData('text/plain');
                                if (url.startsWi
                                    th("http")) {
                                    fetch(ur
                                        l).then(r => r.blob()).then(blob => {

                                        let reader = new FileReader();

                                        reader.onload = () => {

                                            td.innerHTML = "";

                                            let img = document.createElement('img');

                                            img.src = reader.result;

                                            img.style.width = "100%";

                                            img.style.height = "100%";

                                            img.style.objectFit = "contain";

                                            td.appendChild(img);

                                            if (typeof cellData === "object")
                                                cellData.image = reader.result;
                                            else
                                                obj.rows[i][j] = {
                                                    image: reader.result
                                                };

                                        };

                                        reader.readAsDataURL(blob);
                                    });
                                }
                            }
                        });
                        td.addEventListener('contextmenu
                            ', e => {
                            e.preventDefault();
                            showTableMenu(e, obj, i,
                                j);
                            setTimeout(() => td.focu
                                s(), 0);
                        });
                        if (i === 0 && j < nbCols - 1) {
                            let resizer = document.c
                                reateElement('div');
                            resizer.className = "col
                                -resizer";
                            Object.assign(resizer.st
                                yle, {
                                position: "absol
                                ute",
                                top: "0",
                                right: "-3px",
                                width: "6px",
                                height: "100%",
                                cursor: "col-resize",
                                zIndex: "10"
                            });
                            td.appendChild(resizer);
                            resizer.addEventListener
                            ('mousedown', e => {
                                e.preventDefault
                                ();
                                const startX = e
                                    .pageX;
                                const leftC = co
                                    lgroup.children[j];
                                const rightC = c
                                    olgroup.children[j + 1];
                                const wL = parse
                                    Float(obj.colWidths[j]);
                                const wR = parse
                                    Float(obj.colWidths[j + 1]);
                                document.body.st
                                yle.cursor = "col-resize";

                                function onMove(
                                    ev) {
                                    let d =
                                        ev.pageX - startX;
                                    let nl =
                                        wL + d,
                                    nr = wR - d;
                                    if (nl <
                                        30 || nr < 30)
                                        return;
                                    obj.colW
                                    idths[j] = nl;
                                    obj.colW
                                    idths[j + 1] = nr;
                                    leftC.st
                                    yle.width = nl + "px";
                                    rightC.s
                                    tyle.width = nr + "px";
                                }

                                function onUp() {
                                    document
                                    .removeEventListener('mousemove', onMove);
                                    document
                                    .removeEventListener('mouseup', onUp);
                                    document
                                    .body.style.cursor = "";
                                }

                                document.addEven
                                tListener('mousemove', onMove);
                                document.addEven
                                tListener('mouseup', onUp);
                            });
                        }
                        tr.appendChild(td);
                        if (colspan > 1) {
                            for (let k = 1; k < cols
                                pan; k++)
                                obj.rows[i][j + k] = null;
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
                el.addEventListener('dragstart', function (e) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData('move-obj-oid', oid + "");
                    e.dataTransfer.setData('move-obj-page', idx + "");
                    el.classList.add('dragging');
                });
                el.addEventListener('dragend', function () {
                    el.classList.remove('dragging');
                });
                el.onclick = function (e) {
                    selectedElement = {
                        pageIdx: idx,
                        objIdx: oid,
                        type: obj.type
                    };
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
                const moveOidStr = e.dataTransfer.getData('move-obj-oid');
                const movePageStr = e.dataTransfer.getData('move-obj-page');
                const type = e.dataTransfer.getData("type");

                if (type) { // Drag from tools
                    let newObj = null;
                    if (["h1", "h2", "h3", "h4"].includes(type))
                        newObj = {
                            type: type,
                            text: type.toUpperCase(),
                            originalText: type.toUpperCase()
                        };
                    else if (type === "text")
                        newObj = {
                            type: "text",
                            html: "Zone de texte"
                        };
                    else if (type === "table")
                        newObj = {
                            type: "table",
                            rows: [["", "", ""], ["", "", ""], ["", "", ""]]
                        };

                    if (newObj) {
                        page.objects.splice(oid + 1, 0, newObj);
                        renderDocument(); // Re-render, numbering will be updated by manual button
                    }
                } else if (moveOidStr !== "" && movePageStr !== "") { // Drag existing object
                    const srcPageIdx = parseInt(movePageStr);
                    const srcOid = parseInt(moveOidStr);
                    if (srcPageIdx === idx) { // Move within the same page
                        if (srcOid !== oid && srcOid !== oid + 1) { // Check to prevent weird self-drop
                            const [objMoved] = page.objects.splice(srcOid, 1);
                            let destOid = (srcOid < oid) ? oid : oid + 1;
                            page.objects.splice(destOid, 0, objMoved);
                            renderDocument(); // Re-render, numbering will be updated by manual button
                        }
                    } else { // Move from another page
                        const srcPage = pages[srcPageIdx];
                        if (srcPage && Array.isArray(srcPage.objects) && srcOid < srcPage.objects.length) {
                            const [objMoved] = srcPage.objects.splice(srcOid, 1);
                            page.objects.splice(oid + 1, 0, objMoved);
                            renderDocument(); // Re-render, numbering will be updated by manual button
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
    pagin.innerText = `Page ${idx + 1} / ${pages.length}`;
    div.appendChild(content);
    div.appendChild(pagin);

    div.addEventListener('click', function () {
        selectedPage = idx;
        updateSelectionClass();
    });
    if (idx === selectedPage)
        div.classList.add('selected');
    return div;
}

// ---- Nouvelle fonction pour mettre à jour tous les numéros et le sommaire ----
function updateAllChapterNumbers() {
    let hCounters = [0, 0, 0, 0]; // [H1, H2, H3, H4] - Reset for each full update

    pages.forEach((page, pageIdx) => {
        if (pageIdx >= 2 && Array.isArray(page.objects)) { // Start from page 2 (after cover and TOC)
            page.objects.forEach(obj => {
                obj.calculatedPrefix = ""; // Clear previous prefix

                if (/^h[1-4]$/.test(obj.type)) {
                    const level = parseInt(obj.type[1]) - 1; // H1→0, H2→1…

                    hCounters[level]++;
                    // Reset counters for subsequent levels
                    for (let k = level + 1; k < 4; k++) {
                        hCounters[k] = 0;
                    }
                    // Construct prefix: e.g., H1: "1.", H2: "1.1.", H3: "1.1.1."
                    obj.calculatedPrefix = hCounters.slice(0, level + 1).join(".") + ". ";
                }
            });
        }
    });

    // console.log("TOC DEBUG: Data before calling generateTableOfContents:", JSON.parse(JSON.stringify(pages))); // Deep copy for logging - REMOVED as TOC generation moved
    renderDocument(); // Re-render the whole document. TOC will be built by renderPage for idx === 1.
}

// ---- Nouvelle fonction pour générer uniquement le Sommaire ---- (REMOVED - logic moved to renderPage)
// function generateTableOfContents() { ... }


// function showTableMenu(e, obj, rowIdx, colIdx) { /* ... unchanged ... */ }
// function paginateObjects(idx) { /* ... unchanged ... */ }
// function paginatePage(idx) { /* ... unchanged ... */ }

function updateSelectionClass() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    let pagesList = document.querySelectorAll('.page');
    if (pagesList[selectedPage])
        pagesList[selectedPage].classList.add('selected');
    if (selectedElement) {
        if (selectedElement.pageIdx === 0 && selectedElement.objIdx === "mainTitle") {
            let mainTitles = pagesList[0].querySelectorAll('.doc-title');
            if (mainTitles[1])
                mainTitles[1].classList.add('selected');
        } else if (selectedElement.pageIdx >= 0 && pagesList[selectedElement.pageIdx]) { // Check pageIdx validity
            // Check if on TOC page (idx 1), no specific element selection logic needed beyond page.
            // For other pages with objects:
            if (selectedElement.pageIdx >= 2) {
                const pageContent = pagesList[selectedElement.pageIdx].querySelector('.chapter-objects');
                if (pageContent) {
                    // The children of chapter-objects are [drop-target, el, drop-target, el, ...]
                    // So we need to adjust objIdx to find the actual element.
                    // An element is at index 2*objIdx + 1 (because drop-target is at 2*objIdx)
                    // However, the elements themselves (el) are what get the 'selected' class.
                    // The items in chapter-objects are alternating drop-targets and actual content elements.
                    // Let's find the actual content elements directly.
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
    if (!selectedElement)
        return;
    const {
        pageIdx,
        objIdx
    } = selectedElement;
    // Allow deletion from page 2 onwards
    if (pageIdx >= 2 && typeof objIdx === "number") {
        let page = pages[pageIdx];
        if (Array.isArray(page.objects) && objIdx < page.objects.length) {
            page.objects.splice(objIdx, 1);
            selectedElement = null;
            renderDocument(); // Re-render. Numbering will be updated manually.
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
    document.execCommand("fontSize", false, 7);
    let sel = window.getSelection();
    if (!sel.rangeCount)
        return;
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
    // TODO : pictos...
}

/* ------- Ajout / suppression de pages -------- */
function addPage() {
    const newPageObject = {
        type: 'custom', // Type par défaut pour une nouvelle page vierge
        objects: []// Initialement aucun objet dans la nouvelle page
    };

    // Insérer la nouvelle page et son orientation après la page sélectionnée
    // selectedPage est l'index de la page actuellement active
    // On insère à selectedPage + 1 pour mettre la nouvelle page après l'actuelle
    pages.splice(selectedPage + 1, 0, newPageObject);
    orientation.splice(selectedPage + 1, 0, "portrait"); // Orientation par défaut

    // Mettre à jour selectedPage pour pointer vers la nouvelle page insérée
    selectedPage = selectedPage + 1;

    renderDocument(); // Rafraîchir l'affichage de toutes les pages
    updateSelectionClass(); // S'assurer que la nouvelle page est visuellement sélectionnée
}

function deletePage() { // Removed idx parameter, uses selectedPage
    if (selectedPage === 0 || selectedPage === 1) {
        alert("Impossible de supprimer la page de garde ou le sommaire !");
        return;
    }
    if (pages.length <= 2)
        return;
    pages.splice(selectedPage, 1);
    orientation.splice(selectedPage, 1);
    if (selectedPage >= pages.length)
        selectedPage = pages.length - 1;
    selectedElement = null;
    renderDocument(); // Re-render. Numbering will be updated manually.
}

/* ------- Changement d’orientation -------- */
function toggleOrientation(idx = null) {
    if (idx === null)
        idx = selectedPage;
    if (idx === 0 || idx === 1) {
        alert("Impossible de changer l’orientation de la page de garde ou du sommaire.");
        return;
    }
    orientation[idx] = (orientation[idx] === "portrait" ? "landscape" : "portrait");
    renderDocument();
}

/* ------- Rafraîchir (recalcule sommaire) ------- */
// This function seems to be for a hard refresh by reloading from localStorage.
// The new updateAllChapterNumbers() button provides a soft update.
// We can keep this as is, or change its purpose if desired.
function refreshDocument() {
    localStorage.setItem('noticeProject', JSON.stringify({
            pages,
            orientation
        }));
    location.reload();
}

/* ------- Sauvegarder / Charger JSON ------- */
function saveJSON() {
    // Before saving, ensure originalText is up-to-date from any direct DOM edits
    // This is somewhat handled by the blur event on titles, but a full sweep might be safer
    // For now, assuming blur events are sufficient.
    const data = JSON.stringify({
        pages,
        orientation
    });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], {
                type: "application/json"
            }));
    a.download = "notice.json";
    a.click();
    URL.revokeObjectURL(a.href); // Clean up
}

function openJSONFile(input) {
    const file = input.files[0];
    if (!file)
        return;
    let reader = new FileReader();
    reader.onload = evt => {
        try {
            let data = JSON.parse(evt.target.result);
            pages = data.pages || [];
            orientation = data.orientation || [];
            // Ensure loaded objects have originalText if they are titles
            pages.forEach(p => {
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if ((obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) && obj.text && obj.originalText === undefined) {
                            obj.originalText = obj.text; // Initialize if missing
                        }
                    });
                }
            });
            selectedPage = 0; // Reset selection
            selectedElement = null;
            updateAllChapterNumbers(); // Calculate numbers and TOC for the loaded project
            // renderDocument(); // updateAllChapterNumbers already calls renderDocument
        } catch (e) {
            console.error("Error parsing JSON file:", e);
            alert("Erreur lors de l'ouverture du fichier JSON.");
        }
    };
    reader.readAsText(file);
    input.value = ""; // Reset file input
}

// Ensure table menu functions are defined if not included in "..." above
function showTableMenu(e, obj, rowIdx, colIdx) {
    let cellData = obj.rows[rowIdx][colIdx];
    if (cellData === null)
        return;

    let oldMenu = document.getElementById('table-menu-popup');
    if (oldMenu)
        oldMenu.remove();

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

    menu._originTable = e.currentTarget.closest('.table-container').querySelector('table');

    function alignItem(label, align) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, {
            padding: "6px 18px",
            cursor: "pointer"
        });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            // met à jour le modèle
            let c = obj.rows[rowIdx][colIdx];
            if (typeof c === "object")
                c.align = align;
            else
                obj.rows[rowIdx][colIdx] = {
                    text: c,
                    align
                };

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
    alignItem("Aligner à gauche", "left");
    alignItem("Centrer horizontalement", "center");
    // ... other align items

    function structuralItem(label, fn) {
        let item = document.createElement('div');
        item.innerText = label;
        Object.assign(item.style, {
            padding: "6px 18px",
            cursor: "pointer"
        });
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            fn();
            menu.remove();
            renderDocument(); // Structural changes might need full re-render
            // Consider if updateAllChapterNumbers() is needed too
        };
        return item;
    }

    function menuItem(label, fn) { // General purpose menu item
        let item = document.createElement('div');
        item.innerText = label;
        item.style.padding = "6px 18px";
        item.style.cursor = "pointer";
        item.onmouseover = () => item.style.background = "#eef";
        item.onmouseleave = () => item.style.background = "#fff";
        item.onclick = () => {
            fn();
            menu.remove();
            renderDocument();
        };
        return item;
    }

    menu.appendChild(menuItem(obj.headerShaded ? "Désactiver gris de la 1ʳᵉ ligne" : "Griser la 1ʳᵉ ligne", () => {
            obj.headerShaded = !obj.headerShaded;
        }));
    menu.appendChild(document.createElement('hr'));
    menu.appendChild(structuralItem("Ajouter colonne à droite", () => {
            obj.rows.forEach(row => row.splice(colIdx + 1, 0, ""));
            const w = obj.colWidths[colIdx];
            obj.colWidths.splice(colIdx + 1, 0, w);
        }));
    menu.appendChild(structuralItem("Ajouter ligne dessous", () => {
            let newRow = obj.rows[0].map(() => "");
            obj.rows.splice(rowIdx + 1, 0, newRow);
        }));
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
                            if (obj.rows[r][colIdx + k] !== undefined)
                                obj.rows[r][colIdx + k] = "";
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
                for (let i = 1; i < n; i++)
                    obj.rows[rowIdx].splice(colIdx + 1, 0, "");
            }));
    }

    document.body.appendChild(menu);
    // ferme si clic à l’extérieur
    document.addEventListener('mousedown', function hideMenu(ev) {
        if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener('mousedown', hideMenu);
        }
    }, {
        once: true
    }); // Use { once: true } for cleaner event removal
}

// Dummy paginate functions if they are complex and not directly related to numbering for now
function paginateObjects(idx) {
    // Pas de pagination sur la couverture ou sommaire
    if (idx < 2)
        return;
    setTimeout(() => {
        const pageDivs = document.querySelectorAll('.page');
        let currentPageIdx = idx;
        let hasPaginated = false;

        while (currentPageIdx < pages.length) {
            const currentPage = pages[currentPageIdx];
            const thisPageDiv = pageDivs[currentPageIdx];
            if (!thisPageDiv)
                break;
            const chapterObjs = thisPageDiv.querySelector('.chapter-objects');
            if (!chapterObjs)
                break;

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
                    nextPage = {
                        type: currentPage.type,
                        chapterTitle: "",
                        objects: []
                    };
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

function exportCleanHTML() {
    let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Export Notice</title>
    <style>
        body {
            background: #fff;
            font-family: 'Segoe UI', 'Arial', sans-serif; /* Police du mode édition */
            font-size: 12pt;
            margin: 0;
            padding: 0;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            max-width: 210mm;
            max-height: 297mm;
            box-sizing: border-box !important;
            box-shadow: none !important;
			border: 1px solid #555 !important; 
            border-radius: 0 !important;
            margin: 0 auto 10mm auto !important; /* Marge en bas pour séparation visuelle, auto pour centrer */
            padding: 10mm 15mm 10mm 15mm !important; /* Marges A4 approx (H, D, B, G) */
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            page-break-after: always !important;
        }
        .page:last-child {
            page-break-after: avoid !important;
            margin-bottom: 0 !important;
        }
        .page.landscape {
            width: 297mm !important;
            min-height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
        }
        .header {
            background: #fff !important;
            border-bottom: 1px solid #000 !important;
            padding: 0 0 10px 0 !important;
            height: auto !important;
            box-sizing: border-box !important;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
        }
        .header .logo {
            height: 60px; /* Conserver une taille fixe ou la rendre relative si possible */
            width: 60px;
            object-fit: contain;
        }
        .header .doc-title {
            flex: 1;
            margin: 0 18px;
            font-size: 24pt !important;
            font-weight: bold;
            text-align: center;
            color: #000 !important;
        }
        .header .revision {
            min-width: 60px;
            text-align: right;
            font-size: 12pt; /* Ajusté pour être cohérent */
            color: #000 !important;
        }
        .header .revision .index, .header .revision .num {
             color: #000 !important;
        }
        .page .content {
            flex-grow: 1 !important;
            padding: 10px 0 0 0 !important;
            overflow: hidden !important;
            gap: 12px !important;
            box-sizing: border-box !important;
            width: 100% !important;
            display: flex; /* Ajouté pour que les éléments enfants puissent être gérés */
            flex-direction: column; /* Les objets sont empilés verticalement */
            align-items: normal; /* Ou 'stretch' selon le besoin */
        }
        .page .pagination {
            display: block !important;
            position: absolute !important;
            bottom: 5mm !important;
            left: 15mm !important;
            right: 15mm !important;
            text-align: right !important; /* Modifié pour aligner à droite comme demandé précédemment */
            font-size: 10pt !important;
            color: #000 !important;
            width: auto !important;
        }
        .page .img-drop { /* Pour la page de garde si une image y est présente */
            border: none !important;
            min-height: 10cm; /* Hauteur indicative, sera remplie par l'image */
            max-height: 15cm;
            width: 100%;
            background: #fff !important;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 20px auto; /* Centrer le bloc image */
        }
        .page .img-drop img {
            max-width: 100% !important;
            max-height: 100% !important;
            height: auto !important;
            object-fit: contain;
        }
        .rte-area { /* Styles pour les zones de texte enrichi */
            background: #fff !important;
            border: none !important;
            min-height: auto; /* Laisser le contenu déterminer la hauteur */
            padding: 0; /* Le padding est déjà géré par .page ou .content */
        }
        .page-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important; /* ou auto si le contenu doit dicter la largeur */
            margin: 10px 0;
        }
        .page-table th, .page-table td {
            border: 1px solid #000 !important;
            padding: 5px 8px; /* Ajuster le padding des cellules */
            word-break: break-word;
            vertical-align: middle;
            text-align: left;
        }
        .page-table th {
            background: #eee !important;
            font-weight: bold;
        }
        .page .chapter-title, .page h1, .page h2, .page h3, .page h4 { /* Styles pour les titres */
            color: #000 !important;
            font-weight: bold;
            margin: 20px 0 10px 0;
        }
        .page h1, .page .h1 { font-size: 22pt !important; }
        .page h2, .page .h2 { font-size: 18pt !important; }
        .page h3, .page .h3 { font-size: 16pt !important; }
        .page h4, .page .h4 { font-size: 14pt !important; }

        /* Styles spécifiques pour la page de garde (idx === 0) */
        .cover-title {
            font-size: 30pt;
            text-align: center;
            margin: 40px 0; /* Espacement pour le titre de la page de garde */
        }
        /* Styles pour le sommaire (idx === 1) */
        #table-of-contents {
            list-style-type: none;
            padding-left: 0; /* Pas de padding par défaut pour ol */
            font-size: 1.2em; /* Un peu plus grand pour le sommaire */
        }
        #table-of-contents li {
            margin-bottom: 5px; /* Espacement entre les items du sommaire */
        }
    </style>
</head>
<body>
`;

    pages.forEach((pageData, idx) => {
        const pageOrientation = orientation[idx] || 'portrait';
        html += `<div class="page ${pageOrientation === 'landscape' ? 'landscape' : ''}">`;

        // En-tête
        html += `
            <div class="header">
                <img class="logo" src="${(typeof logoData !== "undefined" && logoData.url) ? logoData.url : ''}" alt="Logo">
                <div class="doc-title">${pages[0].docTitle || "Titre du document"}</div>
                <div class="revision">
                    <div class="index">${INDEX_REV}</div>
                    <div class="num">${pages[0].editableNum || NUM_REF}</div>
                </div>
            </div>`;

        // Contenu
        html += `<div class="content">`;
        if (idx === 0) { // Page de Garde
            html += `<div class="cover-title">${pageData.title || "Notice"}</div>`;
            if (pageData.img) {
                html += `<div class="img-drop"><img src="${pageData.img}" alt="Image de couverture"></div>`;
            }
        } else if (idx === 1) { // Sommaire
            html += `<h2>Sommaire</h2>`;
            html += `<ol id="table-of-contents">`;
            // Recalculer le sommaire basé sur les titres H des pages suivantes
            for (let i = 2; i < pages.length; i++) {
                const p = pages[i];
                if (Array.isArray(p.objects)) {
                    p.objects.forEach(obj => {
                        if (/^h[1-4]$/.test(obj.type) && (obj.originalText || obj.text)) {
                            const prefix = obj.calculatedPrefix || "";
                            const textValue = obj.originalText || obj.text || "";
                            const level = parseInt(obj.type[1]);
                            const pageNumberOfTitleExport = i + 1; // i est l'index de la page contenant le titre
                            const anchorId = `export-title-${obj.id}`; // ID pour l'ancre
                            // Ajout simple du numéro de page. Pour un alignement à droite,
                            // il faudrait ajouter des spans et des styles similaires à ceux du mode édition,
                            // ou utiliser des tableaux HTML si la conversion Word doit être plus robuste.
                            // Pour l'instant, simple ajout de texte.
                            html += `<li style="margin-left: ${(level - 1) * 20}px;"><a href="#${anchorId}">${prefix}${textValue} <span>(page ${pageNumberOfTitleExport})</span></a></li>`;
                        }
                    });
                }
            }
            html += `</ol>`;
        } else { // Autres pages
            if (Array.isArray(pageData.objects)) {
                pageData.objects.forEach(obj => {
                    if (obj.type === "chapterTitle" || /^h[1-4]$/.test(obj.type)) {
                        const prefix = obj.calculatedPrefix || "";
                        const text = obj.originalText || obj.text || "";
                        const anchorId = `export-title-${obj.id}`; // ID pour l'ancre
                        html += `<div class="${obj.type}" id="${anchorId}">${prefix}${text}</div>`;
                    } else if (obj.type === "text") {
                        html += `<div class="rte-area">${obj.html || ""}</div>`;
                    } else if (obj.type === "table") {
                        let tableStyle = 'width:100%;'; // Par défaut, prend toute la largeur du conteneur .content
                        html += `<table class="page-table" style="${tableStyle}">`;

                        if (obj.colWidths && Array.isArray(obj.colWidths) && obj.colWidths.length > 0) {
                            const totalWidthInPx = obj.colWidths.reduce((sum, w) => sum + parseFloat(w || 0), 0);
                            if (totalWidthInPx > 0) {
                                html += `<colgroup>`;
                                obj.colWidths.forEach(widthInPx => {
                                    const widthInPercent = (parseFloat(widthInPx || 0) / totalWidthInPx) * 100;
                                    html += `<col style="width: ${widthInPercent.toFixed(2)}%;">`;
                                });
                                html += `</colgroup>`;
                            }
                        }

                        if (Array.isArray(obj.rows)) {
                            obj.rows.forEach((row, rowIndex) => {
                                html += `<tr>`;
                                if (Array.isArray(row)) {
                                    row.forEach(cell => {
                                        if (cell === null)
                                            return; // Pour les cellules fusionnées horizontalement
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
                    // Note: Les icônes/pictogrammes ne sont pas gérés ici, car ce sont des éléments de l'UI.
                    // Si des images sont insérées comme objets, elles devraient être de type "image" et traitées.
                });
            }
        }
        html += `</div>`; // Fin .content

        // Pied de page (Pagination)
        html += `<div class="pagination">Page ${idx + 1} / ${pages.length}</div>`;
        html += `</div>`; // Fin .page
    });

    html += `
</body>
</html>`;

    const blob = new Blob([html], {
        type: 'text/html'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notice_export.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function paginatePage(idx) {
    // Empêche la pagination sur page de garde ou sommaire
    if (idx < 2)
        return;

    setTimeout(() => {
        const pageDivs = document.querySelectorAll('.page');
        let currentPageIdx = idx;

        // On boucle sur chaque page à partir de idx
        while (currentPageIdx < pages.length) {
            const currentPage = pages[currentPageIdx];
            const thisPageDiv = pageDivs[currentPageIdx];
            if (!thisPageDiv)
                break;
            const chapterObjs = thisPageDiv.querySelector('.chapter-objects');
            if (!chapterObjs)
                break;

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
                    nextPage = {
                        type: currentPage.type,
                        chapterTitle: "",
                        objects: []
                    };
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
