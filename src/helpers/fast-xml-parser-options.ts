// Object defines rules for 'fast-xml-parser' library.
// Usage --> const Parser = new XMLParser(xmlParseOptions);

const xmlParseOptions = {
    attributeNamePrefix: '_',
    textNodeName: 'text',
    ignoreAttributes: false,
    removeNSPrefix: true,
    // Having this prop to parse spaces around the value
    // (they are removing by default, f.e parser gives "Spaces" instead of " Spaces  ")
    trimValues: false,
    // Having this prop to parse all numbers as a String, as it was before, decimal numbers, etc
    numberParseOptions: {
        leadingZeros: false,
        hex: false,
        skipLike: /\d/
    }
};

export default xmlParseOptions;
