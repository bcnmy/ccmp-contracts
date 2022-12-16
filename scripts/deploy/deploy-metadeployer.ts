import { getContractAddress } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { Deployer, Deployer__factory } from '../../typechain-types';
import { verifyContract } from '../verify/verify';

export const getDeployerInstance = async (debug?: boolean): Promise<Deployer> => {
  const metaDeployerPrivateKey = process.env.METADEPLOYER_PRIVATE_KEY;
  if (!metaDeployerPrivateKey) {
    throw new Error('META_DEPLOYER_PRIVATE_KEY not set');
  }
  const metaDeployer = new ethers.Wallet(metaDeployerPrivateKey, ethers.provider);
  const deployerAddress = getContractAddress({
    from: metaDeployer.address,
    nonce: 0,
  });

  const provider = ethers.provider;
  const [signer] = await ethers.getSigners();
  const chainId = (await provider.getNetwork()).chainId;
  debug && console.log(`Checking deployer ${deployerAddress} on chain ${chainId}...`);
  const code = await provider.getCode(deployerAddress);
  if (code === '0x') {
    debug && console.log('Deployer not deployed, deploying...');
    const metaDeployerPrivateKey = process.env.METADEPLOYER_PRIVATE_KEY;
    if (!metaDeployerPrivateKey) {
      throw new Error('META_DEPLOYER_PRIVATE_KEY not set');
    }
    const metaDeployerSigner = new ethers.Wallet(metaDeployerPrivateKey, provider);
    const deployer = await new Deployer__factory(metaDeployerSigner).deploy();
    await deployer.deployed();
    debug && console.log(`Deployer deployed at ${deployer.address} on chain ${chainId}`);
    setTimeout(async () => await verifyContract(deployer.address, []), 10000);
  } else {
    console.log(`Deployer already deployed on chain ${chainId}`);
  }

  return Deployer__factory.connect(deployerAddress, signer);
};
