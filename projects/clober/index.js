const abi = require("./abi.json");
const { sumTokens2 } = require('../helper/unwrapLPs')

function factoryAddress(chainId){
    if(chainId === 1101){
        return "0x24aC0938C010Fb520F1068e96d78E0458855111D"
    }else{
        return "0x93A43391978BFC0bc708d5f55b0Abe7A9ede1B91"
    }
}

async function tvl(_, _b, _cb, { api }) {
    const chainId = await api.getChainId()
    let tokenAddresses = await api.fetchList({  lengthAbi: abi.nonce, itemAbi: abi.computeTokenAddress, target: factoryAddress(chainId)})
    tokenAddresses = tokenAddresses.flat()
    const markets = await api.multiCall({  abi: abi.market, calls: tokenAddresses })
    const base = await api.multiCall({  abi: abi.baseToken, calls: markets}) 
    const quote = await api.multiCall({  abi: abi.quoteToken, calls: markets})
    const tokens = [base, quote].flat()
    const symbols = await api.multiCall({  abi: 'erc20:symbol', calls: tokens})
    const putTokens = tokens.filter((_, i) => symbols[i].includes('$') &&  symbols[i].endsWith('PUT'))
    const ownerTokens = markets.map((v, i) => ([[base[i], quote[i]], v]))
    const putQutes = await api.multiCall({  abi: abi.quoteToken, calls: putTokens})
    const putUnderlying = await api.multiCall({  abi: 'address:underlyingToken', calls: putTokens})
    putTokens.forEach((v, i) => ownerTokens.push([[putQutes[i], putUnderlying[i]], v]))
    return sumTokens2({ api, ownerTokens, blacklistedTokens: putTokens, })
}
module.exports = {
    methodology: "TVL consists of assets deposited into market contracts",
    ethereum: { tvl },
    polygon: { tvl },
    arbitrum: { tvl },
    polygon_zkevm: { tvl }
}