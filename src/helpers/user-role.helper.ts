
export const findUserToken = (tokens: IAuthTokenShort[], keepitLogin: string): IAuthTokenShort => {
    const foundToken = tokens.find(token => token.aname === keepitLogin);

    if (!foundToken) {
        throw new Error('We could not find user\'s token.');
    }
    return foundToken;
};
