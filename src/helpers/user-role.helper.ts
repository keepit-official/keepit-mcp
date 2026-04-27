
export const findUserToken = (tokens: IAuthTokenShort[], keepitLogin: string): IAuthTokenShort => {
    const foundToken = tokens.find(token => token.aname?.toLowerCase() === keepitLogin.toLowerCase());

    if (!foundToken) {
        throw new Error('We could not find user\'s token.');
    }
    return foundToken;
};
