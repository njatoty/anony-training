
const getVerticesOnJSOn = (data) => {
    var vertices = [];
    const lineItems = [];
    const vats = [];
    
    if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            let keyValue = data[i];
            // FOR INVOICE
            if (keyValue.pageAnchor) {
                var vert = keyValue.pageAnchor.pageRefs[0].boundingPoly;
                if (vert) {
                    vertices.push({
                        id: keyValue.id,
                        key: toCamelCase(keyValue.type),
                        page: keyValue.pageAnchor.pageRefs[0].page || 0,
                        vertices: vert.normalizedVertices
                    })
                    // get line items
                    const lineItem = extractLineItemDetails("line_item", keyValue)
                    if (lineItem) lineItems.push(lineItem);
    
                    // get vat
                    const vatItem = extractLineItemDetails("vat", keyValue)
                    if (vatItem) vats.push(vatItem);
                }
            } else if (keyValue.formFields) {
    
                let page = keyValue.pageNumber;
    
                vertices = [...keyValue.formFields.map((item, index) => ({
                    id: index,
                    page: page - 1,
                    key: labelToCapitalized(item.fieldName.textAnchor.content),
                    vertices: item.fieldValue.boundingPoly.normalizedVertices,
                }))];
                
                break;
            }
        }
    } else {
        const verticesWithId = data.pages.map(e => {
            return e.blocks.map(b => ({
                page: e.pageNumber - 1,
                vertices: b.layout.boundingPoly.normalizedVertices
            }))
        }).flat().map((v, idx) => ({...v, key: idx}));
        vertices = [...vertices, verticesWithId].flat();
    }
    
    vertices.push({ key: "LineItemsDetails", data: lineItems });
    // vertices.push({ key: "VatDetails", data: vats });
    if (vats.length) {
        const VATs = vats.map((d, vatIndex) => d.properties.map(d => ({
            ...d,
            key: (vats.length === 1 ? "": vatIndex) + convertToPascalCase(d.type)
        }))).flat();
        vertices = [...vertices, ...VATs];
    }
    return vertices;
}



const extractLineItemDetails = (key, data) => {
    if (data.type !== key) {
        return null;
    }

    const lineItem = {
        id: data.id,
        mentionText: data.mentionText,
        vertices: data.pageAnchor.pageRefs[0]?.boundingPoly?.normalizedVertices || [],
        page: data.pageAnchor.pageRefs[0]?.page || 0, // Default to page 1 if not specified
        properties: [],
    };

    data.properties.forEach((property) => {
        const propDetails = {
            id: property.id,
            type: property.type,
            mentionText: property.mentionText,
            vertices: property.pageAnchor.pageRefs[0]?.boundingPoly?.normalizedVertices || [],
            page: property.pageAnchor.pageRefs[0]?.page || lineItem.page, // Default to page 1 if not specified
        };
        lineItem.properties.push(propDetails);
    });

    return lineItem;
};


const toCamelCase = (str = '') => str
    .toLowerCase() // Convert the entire string to lowercase
    .split('_') // Split the string by underscores
    .map((word, index) =>
        index === 0
            ? word.charAt(0).toUpperCase() + word.slice(1) // Capitalize the first letter of the first word
            : word.charAt(0).toUpperCase() + word.slice(1) // Capitalize the first letter of other words
    )
    .join(''); // Join the words back together


function labelToCapitalized(label) {
    if (!label) return "";
    return label
        .replace(/[\n:]+/g, '') // Remove \n and trailing colons
        .replace(/:$/, '') // Remove the trailing colon if it exists
        .trim() // Remove leading and trailing whitespace
        .split(' ') // Split into words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
        .join('')
        .replace(/'/g, ''); // Join them back together
}

function convertToPascalCase(str) {
    return str
      .split(/\/|-|_/) // Split by slash or dash
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
      .join(''); // Join the words together
}

module.exports = {
    getVerticesOnJSOn
}