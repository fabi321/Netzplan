'use strict';

function index() {
    const boxWidth = 50;
    const boxHeight = 20;
    const offsetX = 5;
    const offsetY = 5;
    const arrowSize = 5;
    const spacingY = 20;
    const lineSpacing = 5;

    function buildDependencyTree(entries) {
        let dict = {};
        let unique = [];
        let toSolve = {};
        for (let entry of entries) {
            if (entry.id in dict) {
                return 'Same key exists twice';
            }
            dict[entry.id] = {
                duration: entry.duration,
                dependencies: entry.dependencies,
                name: entry.name,
                dependants: [],
            }
            if (entry.dependencies.length == 0) {
                unique.push(entry.id);
            } else {
                toSolve[entry.id] = entry;
            }
        }

        for (let nodeId of Object.keys(dict)) {
            for (let dependencyId of dict[nodeId].dependencies) {
                if (!(dependencyId in dict)) {
                    return 'Dependency not represented as ID';
                }
                dict[dependencyId].dependants.push(nodeId);
            }
        }

        while (Object.keys(toSolve).length !== 0) {
            let success = false;
            for (let node of Object.keys(toSolve)) {
                let res = toSolve[node].dependencies.every((nodeId) => {
                    return unique.includes(nodeId);
                });
                if (res) {
                    unique.push(node);
                    delete toSolve[node];
                    success = true;
                    break;
                }
            }
            if (!success) {
                return 'Circular dependency detected';
            }
        }
        return dict;
    }

    function arrangeActions(dict) {
        let arrangement = [];
        // distribute actions horizontally
        let toResolve = Object.keys(dict);
        let maxWidth = -Infinity;
        while (toResolve.length !== 0) {
            for (let actionId of toResolve) {
                let action = dict[actionId];
                if (action.dependencies.every(actionId => !toResolve.includes(actionId))) {
                    let target = Math.max(...action.dependencies.map(actionId => dict[actionId].horizontalPos)) + 1;
                    if (target < 0) target = 0;
                    if (target >= arrangement.length) arrangement.push({toResolve: 0, resolved: 0});
                    dict[actionId].horizontalPos = target;
                    arrangement[target].toResolve += 1;
                    toResolve.splice(toResolve.indexOf(actionId), 1);
                    maxWidth = Math.max(maxWidth, target);
                }
            }
        }
        // distribute actions vertically
        toResolve = Object.keys(dict);
        let currentHorizontalPos = 0;
        let maxDepth = -Infinity;
        while (toResolve.length !== 0) {
            for (let actionId of toResolve) {
                let action = dict[actionId];
                let solved = false;
                let futurePos = 0;
                if (action.horizontalPos == 0) {
                    solved = true;
                    futurePos = Object.keys(arrangement[0]).length - 2;
                } else if (action.horizontalPos == currentHorizontalPos){
                    let proposedPos = 0;
                    while (true) {
                        if (!(proposedPos in arrangement[currentHorizontalPos])) {
                            let success = true;
                            for (let dependencyId of action.dependencies) {
                                let dependency = dict[dependencyId];
                                for (let toCheck = dependency.horizontalPos + 1; toCheck < currentHorizontalPos; toCheck++) {
                                    if (arrangement[toCheck][proposedPos] !== undefined) {
                                        success = false;
                                        break;
                                    }
                                }
                                if (!success) break;
                            }
                            if (success) break;
                        }
                        proposedPos += 1;
                    }
                    futurePos = proposedPos;
                    solved = true;
                }
                if (solved) {
                    dict[actionId].verticalPos = futurePos;
                    arrangement[action.horizontalPos][futurePos] = actionId
                    arrangement[action.horizontalPos].resolved += 1;
                    toResolve.splice(toResolve.indexOf(actionId), 1);
                    maxDepth = Math.max(maxDepth, futurePos);
                    break;
                }
            }
            if (arrangement[currentHorizontalPos].toResolve == arrangement[currentHorizontalPos].resolved) {
                currentHorizontalPos += 1;
            }
        }
        return [arrangement, maxWidth, maxDepth];
    }

    function calculateNumbers(dict, arrangement) {
        //Vorwärts
        let last = -Infinity;
        for (let column of arrangement) {
            for (let actionId of Object.keys(column)) {
                if (['toResolve', 'resolved'].includes(actionId)) continue;
                let action = dict[column[actionId]];
                if (action.dependencies.length == 0) {
                    action.faz = 0;
                } else {
                    action.faz = Math.max(...action.dependencies.map(actionId => dict[actionId].fez));
                }
                action.fez = action.faz + action.duration;
                last = Math.max(last, action.fez);
            }
        }
        //Rückwärts
        for (let i = arrangement.length - 1; i >= 0; i--) {
            for (let actionId of Object.keys(arrangement[i])) {
                if (['toResolve', 'resolved'].includes(actionId)) continue;
                let action = dict[arrangement[i][actionId]];
                let largestBuffer = 0;
                if (action.dependants.length == 0) {
                    action.sez = last;
                } else {
                    action.sez = Math.min(...action.dependants.map(actionId => dict[actionId].saz));
                    largestBuffer = Math.max(...action.dependants.map(actionId => dict[actionId].gp))
                }
                action.saz = action.sez - action.duration;
                action.gp = action.sez - action.fez;
                action.fp = Math.max(action.gp - largestBuffer,0)
            }
        } 
    }

    function calculateArrows(dict, arrangement) {
        let interconnectedArrows = [];
         for (let i = 0; i < arrangement.length - 1; i++) {
            interconnectedArrows.push([]);
            for (let actionId of Object.keys(arrangement[i])) {
                if (['toResolve', 'resolved'].includes(actionId)) continue;
                let action = dict[arrangement[i][actionId]];
                if (action !== undefined) {
                    let verticalPos = action.verticalPos;
                    let height = 0;
                    for (let dependantId of action.dependants) {
                        let dependant = dict[dependantId];
                        let critical = dependant.gp == 0 && action.gp == 0 && dependant.faz == action.fez;
                        let sameTarget = interconnectedArrows[i].find(element => {
                            return element.to == dependant.verticalPos
                        });
                        if (sameTarget === undefined) {
                            interconnectedArrows[i].push({
                                from: [{
                                    verticalPos,
                                    height,
                                    critical,
                                }],
                                to: dependant.verticalPos,
                                toRow: dependant.horizontalPos,
                            });
                        } else {
                            sameTarget.from.push({
                                verticalPos,
                                height,
                                critical,
                            })
                        }
                        height += 1;
                    }
                }
            }
        }
        return interconnectedArrows;
    }

    function getSpacing(interconnectedArrows, start, end) {
        return interconnectedArrows.slice(start, end).reduce((prev, current) => prev + current.length * (lineSpacing + 1) + lineSpacing + arrowSize, 0);
    }

    //const canvas = document.querySelector('canvas#output');
    const svg = document.querySelector('svg#vector');
    //const ctx = canvas.getContext('2d');

    function drawRect(x, y, w, h, svgContent) {
        //ctx.strokeRect(x, y, w, h);
        //ctx.strokeRect(x, y, w, h);
        //ctx.strokeRect(x, y, w, h);
        let elem = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        elem.setAttribute('x', x);
        elem.setAttribute('y', y);
        elem.setAttribute('width', w);
        elem.setAttribute('height', h);
        if (svgContent !== undefined) {
            elem.appendChild(svgContent);
        }
        svg.appendChild(elem);
    }

    function drawLine(x1, y1, x2, y2, color) {
        //ctx.beginPath();
        //ctx.strokeStyle = color == undefined ? 'black' : color;
        //ctx.moveTo(x1, y1);
        //ctx.lineTo(x2, y2);
        //ctx.stroke();
        //ctx.stroke();
        //ctx.stroke();
        let elem = document.createElementNS("http://www.w3.org/2000/svg", "line");
        elem.setAttribute('x1', x1);
        elem.setAttribute('y1', y1);
        elem.setAttribute('x2', x2);
        elem.setAttribute('y2', y2);
        if (color !== undefined) {
            elem.setAttribute('stroke', color);
        }
        svg.appendChild(elem);
    }

    function drawPolyLine(x1, y1, x2, y2, x3, y3, color) {
        //ctx.beginPath();
        //ctx.strokeStyle = color == undefined ? 'black' : color;
        //ctx.moveTo(x1, y1);
        //ctx.lineTo(x2, y2);
        //ctx.lineTo(x3, y3);
        //ctx.stroke();
        //ctx.stroke();
        //ctx.stroke();
        let elem = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        elem.setAttribute('points', `${x1},${y1} ${x2},${y2} ${x3},${y3}`);
        if (color !== undefined) {
            elem.setAttribute('stroke', color);
        }
        svg.appendChild(elem);
    }

    function drawText(text, x, y) {
        //ctx.fillText(text, x, y);
        //ctx.fillText(text, x, y);
        //ctx.fillText(text, x, y);
        let elem = document.createElementNS("http://www.w3.org/2000/svg", "text");
        elem.setAttribute('x', x);
        elem.setAttribute('y', y);
        elem.setAttribute('stroke-width', '1');
        elem.textContent = text;
        svg.appendChild(elem);
    }

    function getSvgTitle(content) {
        let elem = document.createElementNS("http://www.w3.org/2000/svg", "title");
        elem.textContent = content;
        return elem;
    }

    function drawArrows(interconnectedArrows) {
        for (let i = 0; i < interconnectedArrows.length; i++) {
            let spacing = getSpacing(interconnectedArrows, 0, i);
            let baseX = (i + 1) * boxWidth * 3 + spacing + offsetX;
            for (let j = 0; j < interconnectedArrows[i].length; j++) {
                let current = interconnectedArrows[i][j];
                let currentCalcIdx = interconnectedArrows[i].length - j - 1;
                let targetY = current.to * boxHeight * 3 + current.to * spacingY + boxHeight * 1.5 + offsetY;
                let intermediateX = baseX + lineSpacing + (lineSpacing + 1) * currentCalcIdx;
                let isCritical = false;
                for (let currentStart of current.from) {
                    let strokeStyle = currentStart.critical ? 'red' : 'black';
                    isCritical |= currentStart.critical;
                    let startY = currentStart.verticalPos * boxHeight * 3 + currentStart.verticalPos * spacingY + lineSpacing + currentStart.height * (lineSpacing + 1) + offsetY;
                    drawPolyLine(baseX, startY, intermediateX, startY, intermediateX, targetY, strokeStyle);
                }
                let targetX = current.toRow * boxWidth * 3 + spacing + getSpacing(interconnectedArrows, i, current.toRow) + offsetX;
                let strokeStyle = isCritical ? 'red' : 'black';
                drawPolyLine(intermediateX, targetY, targetX, targetY, targetX - arrowSize, targetY - arrowSize, strokeStyle);
                drawLine(targetX, targetY, targetX - arrowSize, targetY + arrowSize, strokeStyle);
            }
        }
    }

    function drawTextBoxes(dict, maxWidth, maxDepth, interconnectedArrows) {
        let width = boxWidth * 3 * (maxWidth + 1) + getSpacing(interconnectedArrows) + 2 * offsetX;
        let height = boxHeight * 3 * (maxDepth + 1) + spacingY * maxDepth + 2 * offsetY;
        //canvas.width = width;
        //canvas.height = height;
        //ctx.strokeStyle = 'black';
        //ctx.fillStyle = 'black';
        //ctx.textAlign = "center";
        //ctx.textBaseline = "middle";
        svg.replaceChildren();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', width);
        for (let actionId of Object.keys(dict)) {
            let action = dict[actionId];
            let baseX = action.horizontalPos * boxWidth * 3 + getSpacing(interconnectedArrows, 0, action.horizontalPos) + offsetX;
            let baseY = action.verticalPos * boxHeight * 3 + spacingY * action.verticalPos + offsetY;
            let tooltip = getSvgTitle(`Name: ${action.name}\nID: ${actionId}\nDuration: ${action.duration}\nFAZ: ${action.faz}\nFEZ: ${action.fez}\nSAZ: ${action.saz}\nSEZ: ${action.sez}\nGP: ${action.gp}\nFP: ${action.fp}`);
            drawRect(baseX, baseY, boxWidth * 3, boxHeight * 3, tooltip);
            drawLine(baseX + boxWidth, baseY, baseX + boxWidth, baseY + boxHeight * 3);
            drawLine(baseX + boxWidth * 2, baseY, baseX + boxWidth * 2, baseY + boxHeight * 3);
            drawLine(baseX, baseY + boxHeight, baseX + boxWidth * 3, baseY + boxHeight);
            drawLine(baseX, baseY + boxHeight * 2, baseX + boxWidth * 3, baseY + boxHeight * 2);
            drawText(actionId, baseX + boxWidth * 0.5, baseY + boxHeight * 0.5);
            drawText(action.duration, baseX + boxWidth * 2.5, baseY + boxHeight * 0.5);
            drawText(action.faz, baseX + boxWidth * 0.5, baseY + boxHeight * 1.5);
            drawText(action.gp, baseX + boxWidth * 1.5, baseY + boxHeight * 1.5);
            drawText(action.fez, baseX + boxWidth * 2.5, baseY + boxHeight * 1.5);
            drawText(action.saz, baseX + boxWidth * 0.5, baseY + boxHeight * 2.5);
            drawText(action.fp, baseX + boxWidth * 1.5, baseY + boxHeight * 2.5);
            drawText(action.sez, baseX + boxWidth * 2.5, baseY + boxHeight * 2.5);
        }
    }

    function getContent() {
        let rows = document.querySelectorAll('#input>tbody>tr');
        let entries = [];
        for (let row of rows) {
            let id = row.querySelector('[headers=id]>input').value;
            let name = row.querySelector('[headers=name]>input').value;
            let duration = row.querySelector('[headers=duration]>input').value;
            let dependencies = row.querySelector('[headers=dependencies]>input').value;
            if (id == '' && name == '' && duration == '' && dependencies == '') {
                row.remove();
            } else if (id == '' || duration == '' || isNaN(parseInt(duration))) {
                row.querySelector('#erroricon').classList.add('active');
            } else {
                row.querySelector('#erroricon').classList.remove('active');
                entries.push({
                    id: id,
                    name: name,
                    duration: parseInt(duration),
                    dependencies: dependencies.split(',').map((element) => element.trim()).filter((element) => element != ''),
                });
            }
        }
        return entries;
    }

    const template = document.querySelector('#inputrow');
    function inputChanged() {
        let entries = getContent();
        if (entries.length != 0) {
            let res = buildDependencyTree(entries);
            if ('string' == typeof res) {
                document.querySelector('#error').textContent = res;
            } else {
                let [arrangement, maxWidth, maxDepth] = arrangeActions(res);
                calculateNumbers(res, arrangement);
                let interconnectedArrows = calculateArrows(res, arrangement);
                drawTextBoxes(res, maxWidth, maxDepth, interconnectedArrows);
                drawArrows(interconnectedArrows);
                document.querySelector('#error').textContent = '';
            }
        }
        download();
        upload();
        uploadLibre();
        let clone = template.content.cloneNode(true);
        clone.querySelectorAll('input').forEach((element) => {element.addEventListener('change', inputChanged)});
        document.querySelector('#input>tbody').appendChild(clone);
    }

    let link = document.querySelector('a#download');
    function download() {
        let content = getContent();
        for (let entry of content) {
            entry.dependencies = entry.dependencies.join();
        }
        let json = JSON.stringify(content);
        let originSvg = document.querySelector('svg#vector');
        let svg = originSvg.cloneNode(true);
        let desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
        desc.textContent = encodeURIComponent(json);
        desc.setAttribute('id', 'netzplan-content');
        svg.appendChild(desc);
        link.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML));
    }

    const parser = new DOMParser();
    function upload() {
        function handleFileSelect(e) {
            let file = e.target.files[0];
            link.setAttribute('download', file.name);
            let reader = new FileReader();
            reader.onload = function (e) {
                let svg = parser.parseFromString(e.target.result, 'image/svg+xml');
                let json = decodeURIComponent(svg.querySelector('desc#netzplan-content').textContent);
                let conf = JSON.parse(json);
                let inputs = document.querySelector('#input>tbody');
                inputs.replaceChildren();
                for (let entry of conf) {
                    let clone = template.content.cloneNode(true);
                    clone.querySelectorAll('input').forEach((element) => {element.addEventListener('change', inputChanged)});
                    clone.querySelector('[headers=id]>input').value = entry.id;
                    clone.querySelector('[headers=name]>input').value = entry.name || '';
                    clone.querySelector('[headers=duration]>input').value = entry.duration;
                    clone.querySelector('[headers=dependencies]>input').value = entry.dependencies;
                    inputs.appendChild(clone);
                    inputChanged();
                }
            };
            reader.readAsText(file);
        }
        document.getElementById('upload').addEventListener('change', handleFileSelect, false);
    }

    const getTask = /<Task>.*?<\/Task>/gs;
    const getName = /<Name>([^<]*)<\/Name>/g;
    const getUid = /<UID>(\d*)<\/UID>/g;
    const getDuration = /<Duration>PT(\d*)H0M0S<\/Duration>/g;
    const getPredecessor = /<PredecessorUID>(\d*)<\/PredecessorUID>/g;
    function uploadLibre() {
        function handleFileSelect(e) {
            let file = e.target.files[0];
            link.setAttribute('download', file.name.replace('pod', 'svg'));
            let reader = new FileReader();
            reader.onload = function (e) {
                let content = e.target.result;
                let inputs = document.querySelector('#input>tbody');
                inputs.replaceChildren();
                for (let taskMatch of content.matchAll(getTask)) {
                    let task = taskMatch[0];
                    let dependencies = [];
                    for (let dependency of task.matchAll(getPredecessor)) {
                        dependencies.push(parseInt(dependency[1]))
                    }
                    let clone = template.content.cloneNode(true);
                    clone.querySelectorAll('input').forEach((element) => {element.addEventListener('change', inputChanged)});
                    clone.querySelector('[headers=id]>input').value = parseInt([...task.matchAll(getUid)][0][1]);
                    clone.querySelector('[headers=name]>input').value = [...task.matchAll(getName)][0][1] || '';
                    clone.querySelector('[headers=duration]>input').value = parseInt([...task.matchAll(getDuration)][0][1]) / 8;
                    clone.querySelector('[headers=dependencies]>input').value = dependencies;
                    inputs.appendChild(clone);
                    inputChanged();
                }
            };
            reader.readAsText(file);
        }
        document.getElementById('projects_file').addEventListener('change', handleFileSelect, false);
    }

    inputChanged();
}

index();