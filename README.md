# 3-Tier Kubernetes Project with GitOps, Dynamic PVC, and Route-53 Integration

## For more projects, check out  
## [https://harishnshetty.github.io/projects.html](https://harishnshetty.github.io/projects.html)

[![Video Tutorial]( https://github.com/harishnshetty/image-data-project/blob/7228511f5c982daa50aa7a74fd14c4f1fec88a90/3-tier-k8s-project.jpg)](https://youtu.be/NDVVMcVqyvc)

🔹 Tech Stack

- 🐳 **Docker**
- ☸️ **Kubernetes**
- 📦 **Dynamic PVC (gp2 StorageClass)**
- 🍃 **MongoDB ReplicaSet**
- ⚡ **Argo CD (GitOps)**
- 🌐 **NGINX Ingress**
- 📡 **AWS Route-53 (DNS Management for Custom Domain)**

Create EKS cluster with NodeGroup (2 nodes of t2.medium instance type)
Create EC2 Instance t2.micro (Optional)


<!-- ## Role Name [ eks-custom-role  ]
- IAMFullAccess
- CloudFrontFullAccess
- AmazonVPCFullAccess
- AmazonEC2FullAccess
- eks-custom-role

## name  create custom policy [ eks-access-custom-ploicy ]

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:CreateCluster",
        "eks:DeleteCluster",
        "eks:DescribeCluster",
        "eks:ListClusters",
        "eks:DescribeClusterVersions",
        "eks:DescribeNodegroup",
        "eks:ListNodegroups",
        "eks:ListUpdates",
        "eks:AccessKubernetesApi"
      ],
      "Resource": "*"
    }
  ]
}

``` -->


---
## create a EC2 instance and attach the role

- eks-setup-instance

# AWS Configure 
```bash
aws configure
```
## 1. AWS CLI Installation

Refer: [AWS CLI Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

```bash
sudo apt install -y unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

---

## 2. kubectl Installation

Refer: [kubectl Installation Guide](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)

```bash
sudo apt-get update
# apt-transport-https may be a dummy package; if so, you can skip that package
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg git

# If the folder `/etc/apt/keyrings` does not exist, it should be created before the curl command, read the note below.
# sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.33/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg # allow unprivileged APT programs to read this keyring

# This overwrites any existing configuration in /etc/apt/sources.list.d/kubernetes.list
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.33/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list   # helps tools such as command-not-found to work correctly

sudo apt-get update
sudo apt-get install -y kubectl bash-completion

# Enable kubectl auto-completion
echo 'source <(kubectl completion bash)' >> ~/.bashrc
echo 'alias k=kubectl' >> ~/.bashrc
echo 'complete -F __start_kubectl k' >> ~/.bashrc

# Apply changes immediately
source ~/.bashrc
```

---

## 3. eksctl Installation

Refer: [eksctl Installation Guide](https://eksctl.io/installation/)

```bash
# for ARM systems, set ARCH to: `arm64`, `armv6` or `armv7`
ARCH=amd64
PLATFORM=$(uname -s)_$ARCH

curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$PLATFORM.tar.gz"

# (Optional) Verify checksum
curl -sL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_checksums.txt" | grep $PLATFORM | sha256sum --check

tar -xzf eksctl_$PLATFORM.tar.gz -C /tmp && rm eksctl_$PLATFORM.tar.gz

sudo install -m 0755 /tmp/eksctl /usr/local/bin && rm /tmp/eksctl

# Install bash completion
sudo apt-get install -y bash-completion

# Enable eksctl auto-completion
echo 'source <(eksctl completion bash)' >> ~/.bashrc
echo 'alias e=eksctl' >> ~/.bashrc
echo 'complete -F __start_eksctl e' >> ~/.bashrc

# Apply changes immediately
source ~/.bashrc
```

---

## 4. Helm Installation

Refer: [Helm Installation Guide](https://helm.sh/docs/intro/install/)

```bash
sudo apt-get install curl gpg apt-transport-https --yes
curl -fsSL https://packages.buildkite.com/helm-linux/helm-debian/gpgkey | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/helm.gpg] https://packages.buildkite.com/helm-linux/helm-debian/any/ any main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm bash-completion

# Enable Helm auto-completion
echo 'source <(helm completion bash)' >> ~/.bashrc
echo 'alias h=helm' >> ~/.bashrc
echo 'complete -F __start_helm h' >> ~/.bashrc

# Apply changes immediately
source ~/.bashrc
```

---

## 5. Create EKS Cluster and Nodegroup 

```bash
eksctl create cluster \
  --name my-cluster \
  --region ap-south-1 \
  --version 1.33 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 4 \
  --node-volume-size 20
```
## 6. Create IAM Service Account For EBS
 
Replace `<ACCOUNT_ID>` with your AWS account ID.
- Amazon EBS CSI Driver 

```bash
eksctl utils associate-iam-oidc-provider --cluster my-cluster  --approve --region ap-south-1
```
```bash
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name AmazonEKS_EBS_CSI_Driver_Role \
  --region ap-south-1
```

```bash
eksctl create addon --name aws-ebs-csi-driver --cluster my-cluster --service-account-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AmazonEKS_EBS_CSI_Driver_Role --region ap-south-1 --force

```



## 7. Create IAM Policy for AWS Load Balancer Controller

New policy link: [AWS EKS LBC Policy](https://docs.aws.amazon.com/eks/latest/userguide/lbc-manifest.html)

```bash
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.13.3/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json
```

## 7.1 . Create IAM Service Account For LB
 
Replace `<ACCOUNT_ID>` with your AWS account ID.

```bash
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::<ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --region ap-south-1 \
  --approve
```

---

## 8. Install AWS Load Balancer Controller via Helm

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm install aws-load-balancer-controller eks/aws-load-balancer-controller -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=ap-south-1 \
  --version 1.13.3
```

**Optional:** List available versions:
```bash
helm search repo eks/aws-load-balancer-controller --versions
helm list -A
```

**Verify installation:**
```bash
kubectl get deployment -n kube-system aws-load-balancer-controller
```


## 9. Update kubeconfig

```bash
aws eks update-kubeconfig --name my-cluster --region ap-south-1
```

To check the nodes in your cluster run
```
kubectl get nodes
```

Clone the github repo
```
git clone https://github.com/harishnshetty/3-Tier-K8s-Project-GitOps.git
```

**MONGO Database Setup**


To create Mongo statefulset with Persistent volumes, run the command in manifests folder:
```
kubectl apply -f namespace.yaml
kubectl apply -f mongo.yaml
kubectl apply -f mongo-init.yaml
```
**update 3-tier-ns Namespace**
```
kubectl config set-context --current --namespace 3-tier-ns
```

<!-- ## Enter into mongo-0 Database  (0)
```
kubectl exec -it mongo-0 -- mongo
```

On the `mongo-0` pod, initialise the Mongo database Replica set. In the terminal run the following command:
```
cat << EOF | kubectl exec -it mongo-0 -- mongo
rs.initiate();
sleep(2000);
rs.add("mongo-1.mongo:27017");
sleep(2000);
rs.add("mongo-2.mongo:27017");
sleep(2000);
cfg = rs.conf();
cfg.members[0].host = "mongo-0.mongo:27017";
rs.reconfig(cfg, {force: true});
sleep(5000);
EOF
```
Note: Wait until this command completes successfully, it typically takes 10-15 seconds to finish, and completes with the message: bye -->


<!-- To confirm run this in the terminal:
```
kubectl exec -it mongo-0 -- mongo --eval "rs.status()" | grep "PRIMARY\|SECONDARY"
```

```
rs.status()
```
--- -->

<!-- Create a temporary network utils pod. Enter into a bash session within it. In the terminal run the following command:
```
kubectl run --rm utils -it --image praqma/network-multitool -- bash
```
Within the new utils pod shell, execute the following DNS queries:
```
for i in {0..2}; do nslookup mongo-$i.mongo; done
```
Note: This confirms that the DNS records have been created successfully and can be resolved within the cluster, 1 per MongoDB pod that exists behind the Headless Service - earlier created. 

Exit the utils container
```
exit
``` -->

Create Mongo secret:
```
kubectl apply -f mongo-secret.yaml
```

**API Setup**

Create GO API deployment by running the following command:
```
kubectl apply -f backend.yaml
```



**Frontend setup**

Create the Frontend Deployment resource. In the terminal run the following command:
```
kubectl apply -f frontend.yaml
```


## 11. Installing Argo CD on the eks cluster

  - Docs: https://www.eksworkshop.com/docs/automation/gitops/argocd/access_argocd
  - Docs: https://github.com/argoproj/argo-helm

# Argocd installation via helm chart

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

```bash
kubectl create namespace argocd 
helm install argocd argo/argo-cd --namespace argocd
kubectl get all -n argocd 
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}' 
```
# Another way to get the loadbalancer of the argocd alb url

```bash
sudo apt install jq -y

kubectl get svc argocd-server -n argocd -o json | jq --raw-output '.status.loadBalancer.ingress[0].hostname'
```

Username: admin

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
---
Password: encrypted-password
---

# 12. Configure Route53

## 13.  Delete EKS Cluster (Cleanup) finally u done a project 
 - For more conents reach out https://harishnshetty.github.io/projects.html

```bash
eksctl delete cluster --name my-cluster --region ap-south-1
```
