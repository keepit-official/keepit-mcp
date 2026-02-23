import { XMLBuilder } from 'fast-xml-parser';

const Builder = new XMLBuilder({});

/**
 * js2xml alternative, so we shouldn`t create xml strings by hand,
 * for now it works only with objects and strings
 * Example:
 * Expected result:
        <cloud>
            <name>deviceName</name>
            <type>powerbi</type>
            <attributes>
                <attribute>
                    <name>disable_auto_backup</name>
                    <value>1</value>
                </attribute>
            </attributes>
        </cloud>
 * Actual action:
        generateXmlBody(
            {
                name: 'deviceName',
                type: 'powerbi',
                attributes: {
                    attribute: {
                        name: 'disable_auto_backup',
                        value: 1'}
                    }
            }, 'cloud')
 */

type TXmlBodyPrimitive = string | number | boolean;
type TXmlBodyPossibleValues = IXmlBodyObject |
    IXmlBodyObject[] |
    TXmlBodyPrimitive |
    TXmlBodyPrimitive[] |
    null |
    undefined;
interface IXmlBodyObject {
    [key: string]: TXmlBodyPossibleValues;
}
export const generateXmlBody = (xmlConfigObject: object, parentKey = '') => {
    /**
     * Normalize passed boolean properties.
     * - { key: true } is converted to { key: null }, which is transformed by Builder to '<key/>' 
     * - { key: facle } is converted to { key: undefined }, which is transformed to empty string 
     */
    const normalizeXmlBodyData = (data: IXmlBodyObject) => {
        const objectToReturn = structuredClone(data);
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'boolean') {
                objectToReturn[key] = value === true
                    ? null
                    : undefined;
            } else if (value && typeof value === 'object') {
                objectToReturn[key] = Array.isArray(value)
                    ? (value as IXmlBodyObject[]).map(item =>
                        typeof item === 'object'
                            ? normalizeXmlBodyData(item)
                            : item
                    )
                    : normalizeXmlBodyData(value);
            }
        }

        return objectToReturn;
    };

    const normalizedXmlBodyData = normalizeXmlBodyData(xmlConfigObject as IXmlBodyObject);


    if (parentKey) {
        return Builder.build({
            [parentKey]: normalizedXmlBodyData
        });
    }

    return Builder.build(normalizedXmlBodyData);
};

/**
 * Escapes all potentially dangerous characters, so that the
 * resulting string can be safely used for correct sending XML strings in requests
 */
export const escapeXMLChars = (string: string) =>
    string
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
        .replace(/`/g, '&#x60;')
    ;

export const unescapeXMLChars = (s: string) => {
    const regex = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34);/g;
    const unescaped = {
        '&amp;': '&',
        '&#38;': '&',
        '&lt;': '<',
        '&#60;': '<',
        '&gt;': '>',
        '&#62;': '>',
        '&apos;': "'",
        '&#39;': "'",
        '&quot;': '"',
        '&#34;': '"'
    };
    return s.replace(regex, function (m) {
        return unescaped[m as keyof typeof unescaped];
    });
};

