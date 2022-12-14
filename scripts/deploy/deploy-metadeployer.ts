import { ethers } from 'hardhat';
import { Deployer, Deployer__factory } from '../../typechain-types';

export const getDeployerInstance = async (debug?: boolean): Promise<Deployer> => {
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  if (!deployerAddress) {
    throw new Error('DEPLOYER_ADDRESS not set');
  }

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
  } else {
    console.log(`Deployer already deployed on chain ${chainId}`);
  }

  return Deployer__factory.connect(deployerAddress, signer);
};
