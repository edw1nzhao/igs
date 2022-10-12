export class ParseCodes {

    constructor(sketch, coreUtils) {
        this.sk = sketch;
        this.coreUtils = coreUtils;
        this.parsedFileArray = []; // holds CodeTable objects
    }

    /**
     * Updates parsedFileArray with new codeTable
     * @param  {PapaParse results Array} results
     * @param  {File} file
     */
    processSingleCodeFile(results, file) {
        const codeName = this.coreUtils.cleanFileName(file.name); // remove file extension
        this.parsedFileArray.push(this.createCodeTable(results.data, codeName));
        this.sk.core.updateCodes(codeName);
    }

    /**
     * Handles updating parsedFileArray with for multiCodeFile
     * @param  {PapaParse results Array} results
     */
    processMultiCodeFile(results) {
        this.clear(); // NOTE: clearing all existing code data prevents mixing single and multi code files. You can only have ONE multicode file
        this.updateParsedFileArrayForMultiCodes(results);
        for (const codeTable of this.parsedFileArray) this.sk.core.updateCodes(codeTable.codeName);
    }

    /**
     * For each row, updates either an existing codeTable in parsedFileArray or adds a new codeTable
     * @param  {PapaParse results Array} results
     */
    updateParsedFileArrayForMultiCodes(results) {
        for (const row of results.data) {
            if (this.coreUtils.codeRowForType(row)) { // IMPORTANT: in case there is partial missing data etc. 
                const curCodeName = this.coreUtils.cleanFileName(row[this.coreUtils.headersMultiCodes[0]]);
                let addNewTable = true; // to add new code table if parsedFileArray empty or no name match/existing codeTable NOT updated
                for (const codeTable of this.parsedFileArray) { // test for name match to updated existing codeTable
                    if (codeTable.codeName === curCodeName) {
                        codeTable.parsedCodeArray.push(row); // update matching parsedCodeArray with new row object
                        addNewTable = false;
                        break; // existing codeTable updated so no need to process any other code tables
                    }
                }
                if (addNewTable) this.parsedFileArray.push(this.createCodeTable([row], curCodeName)); // NOTE: make sure row is added as an array
            }
        }
    }

    createCodeTable(resultsDataArray, codeName) {
        return {
            parsedCodeArray: resultsDataArray,
            codeName: codeName,
            counter: 0
        }
    }

    /** 
     * Invoked when creating point arrays in parseMovement
     * Tests if the current time value is between any start/end code times in all loaded codeTables
     * NOTE: comparing to next row in codeTable and use of codeTable counters tries to do this in a most efficient manner
     * Returns list of boolean vars indicating if value is within range for all loaded codes and
     * a single color variable, which can be gray if value is not within range for loaded codes or black if within multiple ranges
     * 
     * @param  {Number/Float} curTime
     */
    getCodeData(curTime) {
        let hasCodeArray = [];
        let color = '#e41a1c'; // if no matching codes are found, this will be the color returned
        for (let i = 0; i < this.parsedFileArray.length; i++) {
            const curCodeTableRow = this.parsedFileArray[i].parsedCodeArray[this.parsedFileArray[i].counter];
            if (this.coreUtils.codeRowForType(curCodeTableRow)) { // IMPORTANT: in case there is partial missing data etc. 
                if (this.timeIsBetweenCurRow(curTime, this.parsedFileArray[i])) {
                    hasCodeArray.push(true);
                    color = this.getCodeColor(color, i);
                } else {
                    if (this.parsedFileArray[i].counter < this.parsedFileArray[i].parsedCodeArray.length - 1 && this.timeIsBetweenNextRow(curTime, this.parsedFileArray[i])) {
                        hasCodeArray.push(true);
                        color = this.getCodeColor(color, i);
                        this.parsedFileArray[i].counter++;
                    } else hasCodeArray.push(false);
                }
            }
        }
        return {
            hasCodeArray,
            color
        }
    }

    // red e41a1c
    // blue 377eb8
    // brown: a65628
    // green: #4daf4a
    //'#6a3d9a', '#ff7f00'

    getCodeColor(color, index) {
        if (color === '#e41a1c') return '#377eb8';
        else return 0; // if color already assigned, make it black because there are multiple true codes for same curTime
    }
    timeIsBetweenCurRow(curTime, codeTable) {
        return this.between(curTime, this.getStartTime(codeTable.parsedCodeArray, codeTable.counter), this.getEndTime(codeTable.parsedCodeArray, codeTable.counter));
    }

    timeIsBetweenNextRow(curTime, codeTable) {
        return this.between(curTime, this.getStartTime(codeTable.parsedCodeArray, codeTable.counter + 1), this.getEndTime(codeTable.parsedCodeArray, codeTable.counter + 1));
    }

    getStartTime(results, row) {
        return results[row][this.coreUtils.headersSingleCodes[0]];
    }

    getEndTime(results, row) {
        return results[row][this.coreUtils.headersSingleCodes[1]];
    }

    between(x, min, max) {
        return x >= min && x <= max;
    }

    clear() {
        this.parsedFileArray = [];
        this.sk.core.clearCodes();
    }

    resetCounters() {
        for (const codeTable of this.parsedFileArray) {
            codeTable.counter = 0;
        }
    }
}