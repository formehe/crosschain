
## **部署合约**

<br>

## eth端合约

- **部署ERC20Sample.sol**

  用来进行跨链测试的代币合约
  
  **参数**：直接部署就行，msg.sender会作为代币持有者


- **部署Limit.sol**
  
  限制合约，用来设置黑名单,解锁时长，锁定金额的限制

  **参数**：直接部署就行，无参数，msg.sender会作为owner


- **部署Deserialize.sol**
  
  library库，用于对收据操作的一些方法

  **参数**：无


- **部署ERC20Locker.sol**

  eth代币的锁定跨链合约（用于锁定和解锁）
  
  **参数**：无


- **部署EthLocker.sol**

  eth的锁定跨链合约（用于锁定和解锁）
  
  **参数**：无
  

- **部署TopBridge.sol**
  
  eth端同步top块头的合约

  **参数**：直接部署就行


- **部署TopProver.sol**

  eth端的收据验证合约

  **参数**：_bridgeLight
  _bridgeLight: 上面的部署TopBridge合约


<br>

## top端合约

- **部署TopErc20Wrapper.sol**

  top端的的对应兑换币种
   
  部署了TopErc20Wrapper需要添加铸造和销毁的权限


- **部署Deserialize.sol**
  
  library库，用于对收据操作的一些方法

  **参数**：无


- **部署Limit.sol**

  限制合约，用来设置黑名单,解锁时长，锁定金额的限制
  
  **参数**：直接部署就行，无参数，msg.sender会作为owner


- **部署ERC20MintProxy.sol**

  top端的跨链合约（用于铸造和销毁）
  
  **参数**：直接部署就行，无参数


- **部署EthProver.sol**

  top端的收据验证合约

  **参数**：_bridgeLight
  _bridgeLight: top网上的块同步合约：ff00000000000000000000000000000000000002


<br>

## **执行合约**

<br>
  
## eth端合约

- **ERC20Locker合约**

  **(1),_ERC20Locker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit limit)**

  初始化
    
  **权限**：
    
  只能初始化一次

  **参数**：

  _prover：上面部署的TopProver合约

  _minBlockAcceptanceHeight： 当前传0就行

  _owner：owner权限者,可以是部署合约的地址

  limit：上面部署的Limit合约

  <br>

  **(2),adminPause(uint flags)**

  设置是否暂停,默认是全暂停

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  flags：设置的标识

  设置为0则是全开启

  设置255则全关闭

  uint public PAUSED_LOCK = 1

  设置115792089237316195423570985008687907853269984665640564039457584007913129639934只开启锁定
    
  uint public PAUSED_UNLOCK = 2

  设置115792089237316195423570985008687907853269984665640564039457584007913129639933只开启解锁

  <br>

  **(3),bindAssetHash(address _fromAssetHash, address _toAssetHash, address _peerLockProxyHash)**  

  绑定资产地址,为了和top端对应上

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  _fromAssetHash：eth端的代币地址

  _toAssetHash：top端的代币地址

  _peerLockProxyHash：top端的跨联合约（例如ERC20MintProxy）

  <br>

- **EthLocker合约**

  **(1),_EthLocker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit limit,address _toAssetHash,address _peerLockProxyHash)**

  初始化

  **权限**：

  只能初始化一次

  **参数**：

  _prover：上面部署的TopProver合约

  _minBlockAcceptanceHeight：当前传0就行

  _owner：owner权限者,可以是部署合约的地址

  limit：上面部署的Limit合约

  _toAssetHash:top端的对应币种

  _peerLockProxyHash：top端的跨链合约（例如ERC20MintProxy）

  <br>

  **(2),adminPause(uint flags)**

  设置是否暂停,默认是全暂停

  **权限**：

  OWNER_ROLE权限

  **参数**：

  flags：设置的标识
    
  OWNER_ROLE权限

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_LOCK = 1

  设置115792089237316195423570985008687907853269984665640564039457584007913129639934只开启锁定

  uint PAUSED_UNLOCK = 2

  设置115792089237316195423570985008687907853269984665640564039457584007913129639933只开启解锁

<br>

- **TopBridge合约**


  **(1),initialize(uint256 _lockEthAmount,address _owner)**

  初始化

  **权限**：
    
  只能初始化一次

  **参数**：
  
  _lockEthAmount：暂无用，传0就行

  _owner：owner权限者,可以是部署合约的地址

  <br>

  **(2),adminPause(uint flags)**

  设置是否暂停,默认是全暂停

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  flags：设置的标识

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_ADD_BLOCK = 4

  设置115792089237316195423570985008687907853269984665640564039457584007913129639931只开启添加块头

  <br>

  **(3),initWithBlock(bytes memory data)**

  初始top创世块

  **权限**：
    
  OWNER_ROLE权限并且只能初始化一次，初始化之后再次初始化会报错

  **参数**：

  data：需要传递rlp编码后的字节流

  <br>

  **(4),grantRole(bytes32 role, address account)**   

  为中继添加权限,只有添加权限的地址才能同步块头

  **权限**：
    
  ADDBLOCK_ROLE的role admin,role admin默认添加的是部署合约的地址

  **参数**：

  role：0xf36087c19d4404e16d698f98ed7d63f18bd7e07261603a15ab119b9c73979a86
   
  account：就是地址
  
  <br>

- **Limit合约**

  **(1),bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**   

  设置eth端锁定资产的最小最大金额

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  _asset：资产地址
   
  _minTransferedToken：最小金额（要乘精度）

  _maxTransferedToken：最大金额（要乘精度）

<br> 

## top端合约

- **ERC20MintProxy**

  **(1),initialize(IEthProver _prover,address _peerProxyHash,uint64 _minBlockAcceptanceHeight,ILimit _limiter)**

  初始化

  **权限**：
    
  只能初始化一次

  **参数**：

  _prover：验证合约(EthProver)

  _peerProxyHash:对端的跨链合约（如ERC20Locker合约）

  _minBlockAcceptanceHeight：当前传0就行

  _limiter：Limit合约

  <br>

  **(2),adminPause(uint flags)**

  设置是否暂停,默认是全暂停

  **权限**：

  OWNER_ROLE权限

  **参数**：

  flags：设置的标识
    
  OWNER_ROLE权限

  设置为0则是全开启

  设置255则全关闭

  uint PAUSED_BURN = 1

  设置115792089237316195423570985008687907853269984665640564039457584007913129639934只开启销毁

  uint PAUSED_MINT = 2

  设置115792089237316195423570985008687907853269984665640564039457584007913129639933只开启铸造
  
  <br>

  **(3),bindAssetHash(address localAssetHash, address peerAssetHash)**

  绑定资产地址,为了和eth端对应上

  **权限**：

  OWNER_ROLE权限

  **参数**：
     
  localAssetHash：top端的资产地址

  peerAssetHash：eth端的资产地址

  <br>
 
  - **Limit合约**

  **(1),bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**   

  设置top端锁定资产的最小最大金额

  **权限**：
    
  OWNER_ROLE权限

  **参数**：

  _asset：资产地址
   
  _minTransferedToken：最小金额（要乘精度）

  _maxTransferedToken：最大金额（要乘精度）

 
 <br>
 
## 其它

**合约部署及部署后执行方法结束后,top端的eth块头同步也需要找有关人员设置下创世eth块头，这样就全部设置完毕**


- **补充说明**

  如果这面进行eth的测试那再部署EthLocker合约，limit，bridge和prover可以复用不用在调用方法


  1)limit再次调用bindTransferedQuota()进行资产最大最小的绑定


  c++代币合约，需要加权限（因为铸造和销毁是需要权限的）


  如果eth那面部署了EthLocker和Erc20Locker,那这面要部署两个一样的ERC20MintProxy的合约(及再部署一个代币合约)，像limit都是通用的。


  1)limit再次调用bindTransferedQuota()进行资产最大最小的绑定
   
<br> 

- **基本流程**

- 部署合约

- 执行合约的参数配置

- 双方块头开始同步

- eth端锁定资产 -> top端铸造资产

- top端燃烧资产 -> eth端解锁资产



 

