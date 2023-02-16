import { useEffect, useState } from "react";
import { GraphQLClient, gql } from "graphql-request";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { providers, ethers } from "ethers";
import {
  Tabs,
  Avatar,
  Button,
  Layout,
  Card,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  InputNumber
} from "antd";
import {
  EditOutlined,
  DollarOutlined,
  DeleteOutlined,
  SyncOutlined
} from "@ant-design/icons";
import "antd/dist/antd.css";
import "./styles.css";

const { Header, Footer, Content } = Layout;
dayjs.extend(relativeTime);

const client = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/salmandabbakuti/super-payroll",
  { headers: {} }
);

const superPayrollABI = [
  "function addEmployee(string _name, uint8 _age, string _contactAddress, string _country, address _addr)",
  "function cancelPaymentStream(address _employeeWalletAddress)",
  "function createPaymentStream(address _employeeWalletAddress, int96 _flowRate)",
  "function deleteEmployee(address _addr)",
  "function currentEmployeeId() view returns (uint256)",
  "function employees(address) view returns (uint256 id, string name, uint8 age, string contactAddress, string country, address addr, address employer, bool isExists)",
  "function employer() view returns (address)",
  "function token() view returns (address)",
  "function updatePaymentStream(address _employeeWalletAddress, int96 _flowRate)"
];

const superPayrollAddress = "0xd67C690568578A421f6DA4272378D49af06644B3";

const calculateFlowRateInTokenPerMonth = (amount) => {
  if (isNaN(amount)) return 0;
  // convert from wei/sec to token/month for displaying in UI
  const flowRate = (ethers.utils.formatEther(amount) * 2592000).toFixed(9);
  // if flowRate is floating point number, remove unncessary trailing zeros
  return flowRate.replace(/\.?0+$/, "");
};

const calculateFlowRateInWeiPerSecond = (amount) => {
  // convert amount from token/month to wei/second for sending to superfluid
  const flowRateInWeiPerSecond = ethers.utils
    .parseEther(amount.toString())
    .div(2592000)
    .toString();
  return flowRateInWeiPerSecond;
};

const STREAMS_QUERY = gql`
  query getStreams(
    $skip: Int
    $first: Int
    $orderBy: Stream_orderBy
    $orderDirection: OrderDirection
    $where: Stream_filter
  ) {
    streams(
      skip: $skip
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      sender
      receiver
      to {
        name,
        addr,
        country
      }
      token
      status
      flowRate
      createdAt
      updatedAt
    }
  }
`;

const EMPLOYEES_QUERY = gql`
  query getEmployees(
    $skip: Int
    $first: Int
    $orderBy: Employee_orderBy
    $orderDirection: OrderDirection
    $where: Employee_filter
  ) {
    employees(
      skip: $skip
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      name
      age
      contactAddress
      country
      addr
      employer
      updatedAt
    }
  }
`;

export default function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [streams, setStreams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatedFlowRate, setUpdatedFlowRate] = useState(0);
  const [superPayrollContract, setSuperPayrollContract] = useState(null);
  const [employeeDetailsInput, setEmployeeDetailsInput] = useState({});
  const [searchInput, setSearchInput] = useState("");

  const handleEmployeeDetailsInputChange = (e) =>
    setEmployeeDetailsInput({
      ...employeeDetailsInput,
      [e.target.name]: e.target.value
    });

  const handleConnectWallet = async () => {
    if (window?.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      console.log("Using account: ", accounts[0]);
      const provider = new providers.Web3Provider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      if (chainId !== 5) {
        message.info("Switching to goerli testnet");
        // switch to the goerli testnet
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x5" }]
        });
      }
      console.log("chainId:", chainId);

      const superPayrollContract = new ethers.Contract(
        superPayrollAddress,
        superPayrollABI,
        provider.getSigner()
      );
      setSuperPayrollContract(superPayrollContract);
      setProvider(provider);
      setChainId(chainId);
      setAccount(accounts[0]);
    } else {
      console.warn("Please use web3 enabled browser");
      message.warn("Please install Metamask or any other web3 enabled browser");
    }
  };

  useEffect(() => {
    if (provider) {
      console.log("window.ethereum", window.ethereum);
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", (chainId) =>
        setChainId(parseInt(chainId))
      );
      window.ethereum.on("connect", (info) =>
        console.log("connected to network", info)
      );

      getStreams();
      getEmployees();
      // sync streams every 30 seconds
      const intervalCall = setInterval(() => {
        getStreams();
      }, 30000);

      return () => {
        clearInterval(intervalCall);
        window.ethereum.removeAllListeners();
      };
    }
  }, [provider]);

  const getStreams = () => {
    setLoading(true);
    client
      .request(STREAMS_QUERY, {
        skip: 0,
        first: 100,
        orderBy: "createdAt",
        orderDirection: "desc",
        where: {
          and: [
            {
              or: [{ sender: account }, { receiver: account }]
            },
            {
              ...(searchInput && {
                or: [{ receiver_contains_nocase: searchInput }]
              })
            }
          ]
        }
      })
      .then((data) => {
        console.log("streams: ", data.streams);
        setStreams(data.streams);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        message.error("Something went wrong!");
        console.error("failed to get streams: ", err);
      });
  };

  const getEmployees = () => {
    setLoading(true);
    client
      .request(EMPLOYEES_QUERY, {
        skip: 0,
        first: 100,
        orderBy: "name",
        orderDirection: "asc",
        where: {
          and: [
            {
              employer: account,
              status: "ACTIVE"
            },
            {
              ...(searchInput && {
                or: [{ name_contains_nocase: searchInput }, { addr_contains_nocase: searchInput }]
              })
            }]
        }
      })
      .then((data) => {
        console.log("employees: ", data.employees);
        setEmployees(data.employees);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        message.error("Something went wrong!");
        console.error("failed to get employees: ", err);
      });
  };

  const handleCreateStream = async ({
    receiver,
    flowRate
  }) => {
    if (!account || chainId !== 5)
      return message.error("Connect to goerli testnet");
    console.log("create inputs: ", receiver, flowRate);
    if (!receiver || !flowRate)
      return message.error("Please fill all the fields");
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await superPayrollContract.createPaymentStream(receiver, flowRateInWeiPerSecond);
      message.success("Stream created successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to create stream");
      console.error("failed to create stream: ", err);
    }
  };

  const handleUpdateStream = async ({
    receiver,
    flowRate
  }) => {
    if (!account || chainId !== 5)
      return message.error("Connect to goerli testnet");
    console.log("update inputs: ", receiver, flowRate);
    if (!flowRate) return message.error("Please enter new flow rate");
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await superPayrollContract.updatePaymentStream(receiver, flowRateInWeiPerSecond);
      message.success("Stream updated successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to update stream");
      console.error("failed to update stream: ", err);
    }
  };

  const handleDeleteStream = async ({ receiver }) => {
    if (!account || chainId !== 5)
      return message.error("Connect to goerli testnet");
    try {
      setLoading(true);
      const tx = await superPayrollContract.cancelPaymentStream(receiver);
      message.success("Stream deleted successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to delete stream");
      console.error("failed to delete stream: ", err);
    }
  };

  const handleAddEmployee = async (employeeDetails) => {
    if (!account || chainId !== 5)
      return message.error("Connect to goerli testnet");
    // check if all fields are filled
    if (
      !["name", "age", "country", "contactAddress", "walletAddress"].every(
        (key) => employeeDetails[key]
      )
    )
      return message.error("Please fill all the fields!");
    console.log("employeeDetails: ", employeeDetails);
    const {
      name,
      age,
      country,
      contactAddress,
      walletAddress
    } = employeeDetails;
    setLoading(true);
    try {
      const tx = await superPayrollContract.addEmployee(
        name,
        age,
        contactAddress,
        country,
        walletAddress
      );
      await tx.wait();
      message.success("Employee added successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to add employee");
      console.error("failed to add employee: ", err);
    }
  };

  const handleDeleteEmployee = async (addr) => {
    if (!account || chainId !== 5)
      return message.error("Connect to goerli testnet");
    setLoading(true);
    try {
      const tx = await superPayrollContract.deleteEmployee(addr);
      await tx.wait();
      message.success("Employee deleted successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to delete employee");
      console.error("failed to delete employee: ", err);
    }
  };

  const streamColumns = [
    {
      title: "Asset",
      key: "token",
      width: "5%",
      render: ({ token }) => {
        const tokenData = {
          icon: "https://raw.githubusercontent.com/superfluid-finance/assets/master/public//tokens/dai/icon.svg",
          symbol: "fDAIx"
        };
        return (
          <>
            <Avatar shape="circle" size="large" src={tokenData.icon} />
            <a
              href={`https://goerli.etherscan.io/token/${token}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 10 }}
            >
              {tokenData.symbol}
            </a>
          </>
        );
      }
    },
    {
      title: "Employer",
      key: "sender",
      ellipsis: true,
      width: "10%",
      render: ({ sender }) => (
        <a
          href={`https://goerli.etherscan.io/address/${sender}`}
          target="_blank"
          rel="noreferrer"
        >
          {sender === account ? `${sender} (You)` : sender}
        </a>
      )
    },
    {
      title: "Employee",
      key: "receiver",
      ellipsis: true,
      width: "10%",
      render: ({ receiver, to }) => (
        <a
          href={`https://goerli.etherscan.io/address/${receiver}`}
          target="_blank"
          rel="noreferrer"
        >
          {receiver === account ? `${receiver} (You)` : `${to.name} (${receiver.slice(0, 6)}...${receiver.slice(-6)})`}
        </a>
      )
    },
    {
      title: "Flow Rate",
      key: "flowRate",
      sorter: (a, b) => a.flowRate.localeCompare(b.flowRate),
      width: "5%",
      render: ({ flowRate, token }) => {
        // calculate flow rate in tokens per month
        const monthlyFlowRate = calculateFlowRateInTokenPerMonth(flowRate);
        return (
          <span style={{ color: "#1890ff" }}>
            {monthlyFlowRate} fDAIx/mo
          </span>
        );
      }
    },
    {
      title: "Created / Updated At",
      key: "createdAt",
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
      width: "5%",
      render: ({ createdAt, updatedAt }) => (
        <Space direction="vertical">
          <span>{dayjs(createdAt * 1000).format("DD MMM YYYY")}</span>
          <span>{dayjs(updatedAt * 1000).format("DD MMM YYYY")}</span>
        </Space>
      )
    },
    {
      title: "Actions",
      width: "5%",
      render: (row) => (
        <>
          {row.sender === account ? (
            <>
              {row.status === "TERMINATED" ? (
                <Tag color="red">TERMINATED</Tag>
              ) : (
                <Space size="small">
                  <Popconfirm
                    title={
                      <InputNumber
                        addonAfter="/month"
                        placeholder="New Flow Rate"
                        onChange={(val) => setUpdatedFlowRate(val)}
                      />
                    }
                    // add descrition as input number to update flow rate
                    description="Enter new flow rate"
                    onConfirm={() =>
                      handleUpdateStream({ ...row, flowRate: updatedFlowRate })
                    }
                  >
                    <Button type="primary" shape="circle">
                      <EditOutlined className="edit_stream" />
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Are you sure to delete?"
                    onConfirm={() => handleDeleteStream(row)}
                  >
                    <Button type="primary" shape="circle" danger>
                      <DeleteOutlined className="delete_stream" />
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </>
          ) : (
            <Space>
              <Tag color="green">INCOMING</Tag>
              {row.status === "TERMINATED" && <Tag color="red">TERMINATED</Tag>}
            </Space>
          )}
        </>
      )
    }
  ];

  const employeeColumns = [
    {
      title: "Name",
      key: "name",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: "4%"
    },
    {
      title: "Age",
      key: "age",
      dataIndex: "age",
      sorter: (a, b) => a.age - b.age,
      width: "2%"
    },
    {
      title: "Address",
      key: "contactAddress",
      dataIndex: "contactAddress",
      sorter: (a, b) => a.contactAddress.localeCompare(b.contactAddress),
      width: "5%"
    },
    {
      title: "Country",
      key: "country",
      dataIndex: "country",
      sorter: (a, b) => a.country.localeCompare(b.country),
      width: "4%"
    },
    {
      title: "Wallet Address",
      key: "addr",
      width: "5%",
      ellipsis: true,
      render: ({ addr }) => (
        <a
          href={`https://goerli.etherscan.io/address/${addr}`}
          target="_blank"
          rel="noreferrer"
        >
          {addr}
        </a>
      )
    },
    {
      title: "Actions",
      key: "actions",
      width: "5%",
      render: (row) => (
        // add delete button and stream create button
        <>
          <Space size="small">
            <Popconfirm
              title={
                <>
                  {/* title with input box */}
                  <p>New Payment Stream</p>
                  <InputNumber
                    addonAfter="DAIx/mo"
                    placeholder="Enter amount"
                    onChange={(val) => setUpdatedFlowRate(val)}
                  />
                </>
              }
              onConfirm={() => handleCreateStream({ receiver: row.addr, flowRate: updatedFlowRate })}
            >
              <Button type="primary" shape="circle">
                <DollarOutlined />
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Are you sure to delete this employee?"
              onConfirm={() => handleDeleteEmployee(row.addr)}
            >
              <Button type="primary" shape="circle" danger>
                <DeleteOutlined className="delete_stream" />
              </Button>
            </Popconfirm>
            {/* add create stream button  */}
          </Space>
        </>
      )
    }
  ];

  return (
    <>
      <Layout style={{ minHeight: "100vh" }}>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            <h1 style={{ textAlign: "center", color: "white" }}>
              Super Payroll
            </h1>
          </Header>
          <Content
            className="site-layout-background"
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280
            }}
          >
            {provider ? (
              <div>
                {/* account card on the right */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "-40px",
                    marginRight: "-30px",
                    marginBottom: "20px"
                  }}
                >
                  {account && (
                    <Card type="inner" size="small">
                      <Card.Meta
                        title={
                          <Button
                            type="primary"
                            shape="round"
                            onClick={() => window.location.reload()}
                          >
                            Disconnect
                          </Button>
                        }
                        description={`${account.slice(0, 8)}...${account.slice(
                          -8
                        )}`}
                        avatar={
                          <Avatar
                            shape="circle"
                            size="large"
                            alt="Profile"
                            src={`https://api.dicebear.com/5.x/open-peeps/svg?seed=${account}`}
                          />
                        }
                      />
                    </Card>
                  )}
                </div>
                {/* Create Stream Section Starts */}
                <Card className="new-post-card-container" title="Add Employee">
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Input
                      type="text"
                      placeholder="Name"
                      name="name"
                      onChange={handleEmployeeDetailsInputChange}
                    />
                    <Space direction="horizantal" style={{ width: "100%" }}>
                      <Input
                        type="number"
                        placeholder="Age"
                        name="age"
                        onChange={handleEmployeeDetailsInputChange}
                      />
                      <Input
                        type="text"
                        placeholder="Country"
                        name="country"
                        onChange={handleEmployeeDetailsInputChange}
                      />
                    </Space>
                    <Input
                      placeholder="Contact Address"
                      name="contactAddress"
                      onChange={handleEmployeeDetailsInputChange}
                    />
                    <Input
                      type="text"
                      placeholder="Wallet Address"
                      name="walletAddress"
                      onChange={handleEmployeeDetailsInputChange}
                    />
                  </Space>
                  <Button
                    type="primary"
                    shape="round"
                    style={{ marginTop: 10 }}
                    loading={loading}
                    disabled={loading}
                    onClick={() => handleAddEmployee(employeeDetailsInput)}
                  >
                    Add Employee
                  </Button>
                </Card>
                {/* Create Stream Section Ends */}

                {/* Streams Table Starts */}
                <Tabs
                  // onChange={ }
                  type="line"
                  animated
                  style={{ marginBottom: 20 }}
                  items={[
                    {
                      key: "1",
                      label: "Employees",
                      children: (
                        <>
                          <Space>
                            <Input.Search
                              placeholder="Search by employee name or wallet address"
                              value={searchInput}
                              enterButton
                              allowClear
                              loading={loading}
                              onSearch={getEmployees}
                              onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <Button type="primary" onClick={getEmployees}>
                              Refresh
                              <SyncOutlined />
                            </Button>
                          </Space>
                          <Table
                            className="table_grid"
                            columns={employeeColumns}
                            rowKey="id"
                            dataSource={employees}
                            scroll={{ x: 970 }}
                            loading={loading}
                            pagination={{
                              pageSizeOptions: [10, 25, 50, 100],
                              showSizeChanger: true,
                              defaultCurrent: 1,
                              defaultPageSize: 10,
                              size: "default"
                            }}
                            onChange={() => { }}
                          />
                        </>
                      )
                    },
                    {
                      key: "2",
                      label: "Payment Streams",
                      children: (
                        <>
                          <Space>
                            <Input.Search
                              placeholder="Search by employee wallet address"
                              value={searchInput}
                              enterButton
                              allowClear
                              loading={loading}
                              onSearch={getStreams}
                              onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <Button type="primary" onClick={getStreams}>
                              Refresh
                              <SyncOutlined />
                            </Button>
                          </Space>
                          <Table
                            className="table_grid"
                            columns={streamColumns}
                            rowKey="id"
                            dataSource={streams}
                            scroll={{ x: 970 }}
                            loading={loading}
                            pagination={{
                              pageSizeOptions: [10, 25, 50, 100],
                              showSizeChanger: true,
                              defaultCurrent: 1,
                              defaultPageSize: 10,
                              size: "default"
                            }}
                            onChange={() => { }}
                          />
                        </>
                      )
                    }
                  ]}
                />
              </div>
            ) : (
              <Button
                style={{ marginLeft: "30%" }}
                type="primary"
                shape="round"
                onClick={handleConnectWallet}
              >
                Connect Wallet
              </Button>
            )}
          </Content>
          <Footer style={{ textAlign: "center" }}>
            <a
              href="https://github.com/Salmandabbakuti"
              target="_blank"
              rel="noopener noreferrer"
            >
              © {new Date().getFullYear()} Salman Dabbakuti. Powered by
              Superfluid
            </a>
          </Footer>
        </Layout>
      </Layout>
    </>
  );
}
