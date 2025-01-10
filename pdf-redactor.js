const { PDFNet } = require('@pdftron/pdfnet-node');
const axios = require('axios');
const { getVerticesOnJSOn } = require('./anonymisation-method');
const path = require('path');
require('dotenv').config();

async function convertToColorPt(colorInput) {
    let r, g, b;

    if (typeof colorInput === 'string' && colorInput.startsWith('#')) {
        // If input is HEX
        ({ r, g, b } = hexToRgb(colorInput));
        
    } else if (typeof colorInput === 'string' && colorInput.startsWith('rgb')) {
        // If input is RGB string
        ({ r, g, b } = parseRgbString(colorInput));
    } else {
        throw new Error('Invalid color format. Use HEX (#RRGGBB) or RGB string (rgb(r, g, b)).');
    }

    // Normalize RGB values to [0, 1]
    const normalizedR = r / 255;
    const normalizedG = g / 255;
    const normalizedB = b / 255;

    // Initialize and return PDFNet.ColorPt
    return await PDFNet.ColorPt.init(normalizedR, normalizedG, normalizedB, 1); // Alpha = 1 (fully opaque)
}

// Helper to convert HEX to RGB
function hexToRgb(hex) {
    hex = hex.replace('#', ''); // Remove '#' if present
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
}

// Helper to parse RGB string
function parseRgbString(rgbString) {
    const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) {
        throw new Error('Invalid RGB string format. Use "rgb(r, g, b)".');
    }
    return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
    };
    
}


/**
 * Redacts specified rectangular areas in a PDF document.
 *
 * @param {Object} params - The parameters for the redaction.
 * @param {string} params.pdfURL - The URL of the PDF document to be redacted.
 * @param {string} params.verticesURL - The URL of the JSON file containing the vertices data for redaction.
 * @param {string} [params.color='#000000'] - The color of the redaction overlay in HEX or RGB format.
 * @param {string[]} [params.targets=[]] - The list of target fields to redact.
 * @returns {Promise<string>} - The file path of the redacted PDF document.
 *
 * @throws {Error} - Throws an error if the PDF or vertices data cannot be loaded or processed.
 */
async function anonymizePDF({
    pdfURL, verticesURL, color='#000000',
    targets = []
}) {
    
    // Load the existing PDF from URL
    const responseP = await axios.get(pdfURL, { responseType: 'arraybuffer' });
    const PDFBytes = responseP.data;
    // Load the Vertices online
    const responseV = await axios.get(verticesURL, { responseType: 'application/json' });
    const verticesDataJSON = JSON.parse(responseV.data);
    const VERTICES = getVerticesOnJSOn(verticesDataJSON);

    // filter out the vertices that is supposed to hide
    const FILTERED_VERTICES = VERTICES.filter(vertex => targets.includes(vertex.key));

    const doc = await PDFNet.PDFDoc.createFromBuffer(PDFBytes);
    doc.initSecurityHandler();

    const redactionArray = [];
    for (const vertex of FILTERED_VERTICES) {

        if (typeof vertex.page === 'undefined') continue;

        let pageNum = parseInt(vertex.page) + 1;
        // Get the first page to determine the document width and height
        const page = await doc.getPage(pageNum);
        const mediaBox = await page.getMediaBox();
        const width = await mediaBox.width();
        const height = await mediaBox.height();
        
        const [topLeft, topRight, , bottomLeft] = vertex.vertices;

        const denormalize = (value, size) => value * size;

        // Calculate original values
        const x1 = denormalize(topLeft.x, width);
        const y1 = height - denormalize(topLeft.y, height); // Adjust y-coordinate
        const x2 = denormalize(topRight.x, width);
        const y2 = height - denormalize(bottomLeft.y, height); // Adjust y-coordinate
    
        redactionArray.push(
            await PDFNet.Redactor.redactionCreate(pageNum, await PDFNet.Rect.init(x1, y2, x2, y1), false, "")
        );
    }

    const bgColor = await convertToColorPt(color);
    // customize appearance of redaction overlay
    const redactionAppearance = {
        redaction_overlay: true,
        border: false,
        show_redacted_content_regions: false,
        positive_overlay_color: bgColor,
        redacted_content_color: bgColor,
    };

    // redact the PDF
    await PDFNet.Redactor.redact(doc, redactionArray, redactionAppearance);

    const originalFileName = path.basename(pdfURL, path.extname(pdfURL));
    const outputFileName = `./SV-ANONYMISED_${originalFileName}.pdf`;

    await doc.save(outputFileName, PDFNet.SDFDoc.SaveOptions.e_linearized);

    const KEYS_NOT_FOUND = targets.filter(t => !FILTERED_VERTICES.map(v => v.key).includes(t));

    return {
        status: "OK",
        fileName: outputFileName,
        ...(KEYS_NOT_FOUND.length > 0) && { warning: "Keys not found: " + KEYS_NOT_FOUND.join(", ") + "." }
    };
}

function isURL(str) {
    const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
    return pattern.test(str);
}
    
async function hideInfosPDF(req, res) {
    const { pdfURL, verticesURL, color='#000000', targets=[] } = req.body;

    if (!isURL(pdfURL) || !isURL(verticesURL)) {
        res.status(400).send({ error: 'PDF URL and vertices URL are required.' });
        return;
    }

    try {

        await PDFNet.initialize(process.env.DEMO_LICENSE_KEY);
        console.log("PDFNet initialized and licensed.");
        const data = await PDFNet.runWithCleanup(() => anonymizePDF({
            pdfURL: pdfURL,
            verticesURL: verticesURL,
            color: color,
            targets: targets
        }), process.env.DEMO_LICENSE_KEY)
        
        console.log('Redacted file saved to', data.fileName);
        // await PDFNet.shutdown(); // Ensure proper cleanup
        res.status(200).send({ data });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
}


module.exports = { hideInfosPDF };