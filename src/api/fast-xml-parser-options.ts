// Object defines rules for 'fast-xml-parser' library.
// Usage --> const Parser = new XMLParser(xmlParseOptions);
// XXE note: fast-xml-parser does not support external DTD/entity processing, so XXE attacks
// are not possible regardless of input. No explicit opt-out flag is required.

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
        // /\d/ matches any string that contains at least one digit, which is intentionally broad:
        // it prevents fast-xml-parser from converting *any* digit-containing value to a JS number.
        // A narrower regex (e.g. /^\d+$/) would still parse mixed strings like "v2.1" as numbers.
        skipLike: /\d/
    }
};

export default xmlParseOptions;
