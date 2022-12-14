import { ethers } from 'hardhat';
import { deploy, deploySampleContract } from './deploy';
import type { DeployParams } from './deploy';
import { verifyContract } from '../verify/verify';

const deployParamsBase = {
  owner: '0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404',
  pauser: '0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404',
};

export const deployParams: Record<number, DeployParams> = {
  420: {
    ...deployParamsBase,
    abacusConnectionManager: '0x16B710b86CAd07E6F1C531861a16F5feC29dba37',
    abacusInterchainGasMaster: '0xeb6f11189197223c656807a83B0DD374f9A6dF44',
  },
  421613: {
    ...deployParamsBase,
    abacusConnectionManager: '0x4926a10788306D84202A2aDbd290b7743146Cc17',
    abacusInterchainGasMaster: '0x679Dc08cC3A4acFeea2f7CAFAa37561aE0b41Ce7',
  },
  80001: {
    ...deployParamsBase,
    axelarGateway: '0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B',
    wormholeGateway: '0x0CBE91CF822c73C2315FB05100C2F714765d5c20',
    wormholeDeploymentMode: 1,
    abacusConnectionManager: '0xb636B2c65A75d41F0dBe98fB33eb563d245a241a',
    abacusInterchainGasMaster: '0x9A27744C249A11f68B3B56f09D280599585DFBb8',
  },
  43113: {
    ...deployParamsBase,
    axelarGateway: '0xC249632c2D40b9001FE907806902f63038B737Ab',
    wormholeGateway: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
    wormholeDeploymentMode: 1,
    abacusConnectionManager: '0x33AbaF6708be03Bdf0595DA0745A7111b01dB8c7',
    abacusInterchainGasMaster: '0x4834a491f78BBF48e983F9Ce0E20D1E4DbE013D8',
  },
  5: {
    ...deployParamsBase,
    wormholeGateway: '0x706abc4E45D419950511e474C7B9Ed348A4a716c',
    wormholeDeploymentMode: 1,
    abacusConnectionManager: '0x01812D60958798695391dacF092BAc4a715B1718',
    abacusInterchainGasMaster: '0x44b764045BfDC68517e10e783E69B376cef196B2',
  },
  4002: {
    ...deployParamsBase,
    axelarGateway: '0x97837985Ec0494E7b9C71f5D3f9250188477ae14',
    wormholeGateway: '0x1BB3B4119b7BA9dfad76B0545fb3F531383c3bB7',
    wormholeDeploymentMode: 1,
  },
  97: {
    ...deployParamsBase,
    axelarGateway: '0x4D147dCb984e6affEEC47e44293DA442580A3Ec0',
    wormholeGateway: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    abacusConnectionManager: '0xe403E16db1f5997bC62Dc611A8d42836364A7f01',
    abacusInterchainGasMaster: '0x155b1F1801030Ea4dF038107d3cc1b4bA496916e',
    wormholeDeploymentMode: 1,
  },
  31337: {
    ...deployParamsBase,
    axelarGateway: '0xC249632c2D40b9001FE907806902f63038B737Ab',
    wormholeGateway: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
    wormholeDeploymentMode: 1,
    abacusConnectionManager: '0x33AbaF6708be03Bdf0595DA0745A7111b01dB8c7',
    abacusInterchainGasMaster: '0x4834a491f78BBF48e983F9Ce0E20D1E4DbE013D8',
  },
};

if (require.main === module) {
  (async () => {
    const networkId = (await ethers.provider.getNetwork()).chainId;
    console.log(`Network: ${networkId}`);

    const params = deployParams[networkId];
    if (!params) {
      throw new Error(`No deploy params for network ${networkId}`);
    }

    const { contracts, constructorArgs } = await deploy(params, true);

    console.log('Contracts: ');
    for (const [key, contract] of Object.entries(contracts)) {
      if (contract) {
        console.log(`   ${key}: ${contract.address}`);
      }
    }

    for (const [key, contract] of Object.entries(contracts)) {
      const contractName = key as keyof typeof constructorArgs;
      try {
        await verifyContract(contract.address, constructorArgs[contractName] || []);
      } catch (e) {
        console.log(`Failed to verify ${key}: ${e}`);
      }
    }
  })();
}
