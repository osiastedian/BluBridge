import * as waxjs from '@waxio/waxjs/dist';

class WaxService {
    wax = new waxjs.WaxJS({ rpcEndpoint: 'https://wax.greymass.com' });

    constructor() {}

    get accountName(): string {
        return this.wax.userAccount;
    }

    async login(callback: Function) {
        try {
        const userAccount = await this.wax.login();
        const pubKeys = this.wax.pubKeys;

        callback(userAccount);
        } catch (e) {}
    }

    async fetchBalance(accountName: string): Promise<number> {
        if (!this.wax.api) {
            await this.login(() => {});
        }
        const value = await this.wax.api.rpc.get_currency_balance('eosio.token', accountName, 'WAX');
        let waxValue = 0;

        if (value[0]) {
            waxValue = Number(value[0].split(' ')[0]);
        }

        return waxValue;
    }
}

const waxService = new WaxService();
export default waxService;