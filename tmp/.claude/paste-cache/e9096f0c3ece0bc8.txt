class Solution {
public:

    void Combination(int idx,
                     int target,
                     vector<int>& candidates,
                     vector<vector<int>>& ans,
                     vector<int>& arr) {

        // Valid combination found
        if (target == 0) {
            ans.push_back(arr);
            return;
        }

        // No candidates left
        if (idx == candidates.size()) {
            return;
        }

        // Pick current element
        if (candidates[idx] <= target) {

            arr.push_back(candidates[idx]);

            Combination(idx,
                        target - candidates[idx],
                        candidates,
                        ans,
                        arr);

            arr.pop_back();
        }

        // Skip current element
        Combination(idx + 1,
                    target,
                    candidates,
                    ans,
                    arr);
    }

    vector<vector<int>> combinationSum(vector<int>& candidates,
                                       int target) {

        vector<vector<int>> ans;
        vector<int> arr;

        Combination(0,
                    target,
                    candidates,
                    ans,
                    arr);

        return ans;
    }
};