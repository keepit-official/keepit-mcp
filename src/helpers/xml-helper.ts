import { XMLBuilder } from 'fast-xml-parser';

// processEntities: true (default) ensures user-supplied strings are XML-escaped automatically.
const Builder = new XMLBuilder({ processEntities: true });

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


