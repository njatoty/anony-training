const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Replace node-fetch with axios
const { getVerticesOnJSOn } = require('./anonymisation-method');

/**
 * Cover text in a PDF with rectangles based on vertices from an online JSON.
 * @param {Object} params - The parameters for the function.
 * @param {string} params.pdfURL - The URL of the PDF file to be processed.
 * @param {string} params.verticesURL - The URL of the JSON file containing vertices information.
 * @param {Object} [params.rectColor={ r: 0, g: 0, b: 0 }] - The color of the rectangle (default is black).
 * @param {Object} [params.borderColor={ r: 0, g: 0, b: 0 }] - The color of the rectangle border (default is black).
 */
async function coverTextWithNormalizedRectangle({
    pdfURL, verticesURL, rectColor = { r: 0, g: 0, b: 0 }, borderColor = { r: 0, g: 0, b: 0 },
    targets = []
}) {
    // Load the existing PDF from URL
    const responseP = await axios.get(pdfURL, { responseType: 'arraybuffer' });
    const existingPdfBytes = responseP.data;
    // Load the Vertices online
    const responseV = await axios.get(verticesURL, { responseType: 'application/json' });
    const existingVerticesJSON = JSON.parse(responseV.data);
    const VERTICES = getVerticesOnJSOn(existingVerticesJSON);

    // filter out the vertices that is supposed to hide
    const FILTERED_VERTICES = VERTICES.filter(vertex => targets.includes(vertex.key));

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    // loop through the vertices
    for (const vertex of FILTERED_VERTICES) {

        if (typeof vertex.page === 'undefined') continue;

        const page = pages[parseInt(vertex.page)];
        const { width, height } = page.getSize();
        const [topLeft, topRight, , bottomLeft] = vertex.vertices;

        const denormalize = (value, size) => value * size;

        // Calculate original values
        const x = denormalize(topLeft.x, width);
        const y = denormalize(topLeft.y, height);
        const rectWidth = denormalize(topRight.x - topLeft.x, width);
        const rectHeight = denormalize(bottomLeft.y - topLeft.y, height);

        // Draw a rectangle over the text to cover it
        page.drawRectangle({
            x: x,
            y: height - (y + rectHeight),
            width: rectWidth,
            height: rectHeight,
            color: rgb(rectColor.r, rectColor.g, rectColor.b),  // Rectangle color
            borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),  // Border color
            borderWidth: 0
        });
    }

    // Save the modified PDF
    const pdfBytes = await pdfDoc.save();
    const originalFileName = path.basename(pdfURL, path.extname(pdfURL));
    const outputFileName = `ANONYMISED_${originalFileName}.pdf`;
    fs.writeFileSync(outputFileName, pdfBytes); // Output file with the text covered

    return outputFileName;
}
