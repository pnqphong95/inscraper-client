class AuthenticationRepository {

  static newInstance() {
    return new this();
  }
  
  constructor() {
    this.Sheet = Config.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Authentication = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Authentication', rowShift: 1 });
  }

  updateAuth(existingAuth, newAuthAttrs) {
    existingAuth['Instagram ID'] = newAuthAttrs.id;
    existingAuth['Last Used'] = new Date().toISOString();
    existingAuth['Expires'] = newAuthAttrs.expires;
    existingAuth['Max-Age'] = newAuthAttrs['Max-Age'];
    existingAuth['CSRF Token'] = newAuthAttrs.csrfToken;
    existingAuth['Request Cookie'] = newAuthAttrs.requestCookie;
    existingAuth.save();
  }

  updateAuthLastUsed(existingAuth) {
    existingAuth['Last Used'] = new Date().toISOString();
    existingAuth.save();
  }

  getEnableAuths() {
    return this.Authentication.where({ Disable: false })
      .order(AuthenticationRepository.lastUsedComparator).all();
  }

  getAll() {
    return this.Authentication
      .order(AuthenticationRepository.lastUsedComparator).all();
  }

  static lastUsedComparator(authOne, authTwo) {
    if (!authOne['Last Used'] && authTwo['Last Used']) return -1;
    if (authOne['Last Used'] && !authTwo['Last Used']) return 1;
    if (!authOne['Last Used'] && !authTwo['Last Used']) return 0;
    const lastUsedAuthOne = new Date(authOne['Last Used']);
    const lastUsedAuthTwo = new Date(authTwo['Last Used']);
    if (lastUsedAuthOne < lastUsedAuthTwo) return -1;
    if (lastUsedAuthOne > lastUsedAuthTwo) return 1;
    return 0;
  }

}